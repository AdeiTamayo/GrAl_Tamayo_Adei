import sys
import mediapipe as mp 
from mediapipe.tasks.python import vision 
import numpy as np 
import cv2 
import argparse
import os
import subprocess

print("[DEBUG] landmarks_video.py started", flush=True)
print("[DEBUG] Importing modules...", flush=True)
sys.stdout.flush()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

FFMPEG_PATH = os.path.join(
    BASE_DIR,
    "tools",
    "ffmpeg",
    "bin",
    "ffmpeg.exe"
)

# =============================================================================
# CONNECTIONS & TOPOLOGY CONFIGURATIONS
# =============================================================================

# Complete layout network map for general-purpose pose tracking
FULL_POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10), (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21),
    (17, 19), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),
    (27, 29), (28, 30), (29, 31), (30, 32), (27, 31), (28, 32)
]

# Isolated structural map for squat tracking (facial features and upper arm extremities omitted)
SQUAT_POSE_CONNECTIONS = [
    (11, 12),  # Shoulder Line
    (11, 23),  # Left Torso Profile (Shoulder to Hip)
    (12, 24),  # Right Torso Profile (Shoulder to Hip)
    (23, 24),  # Hips Width Line
    (23, 25), (25, 27), (27, 29), (29, 31), (27, 31),  # Left Leg Assembly
    (24, 26), (26, 28), (28, 30), (30, 32), (28, 32)   # Right Leg Assembly
]

# Track explicitly which connection segments represent the back line profile 
SPINE_CONNECTIONS = [(11, 23), (12, 24)]


# =============================================================================
# BIOMECHANICAL UTILITIES
# =============================================================================

def calculate_angle(p1, p2, p3):
    a = np.array(p1)
    b = np.array(p2)  # Vertex node
    c = np.array(p3)
    
    ba = a - b
    bc = c - b
    
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)


# =============================================================================
# EXERCISE ANALYSIS ENGINE
# =============================================================================

class SquatAnalyzer:
    """Tracks state parameters and evaluates real-time safety thresholds for squats."""
    
    def __init__(self):
        self.state = "UP"
        self.rep_count = 0
        self.feedback_message = "Keep torso upright"
        self.is_back_compromised = False
        self.current_knee_angle = 180.0

    def analyze_frame(self, landmarks_px):
        """Processes frame coordinates to parse angles and trigger warning states."""
        if len(landmarks_px) <= 28:
            return

        shoulder = landmarks_px[12]
        hip = landmarks_px[24]
        knee = landmarks_px[26]
        ankle = landmarks_px[28]

        # 1. Back Alignment Metric: Torso angle relative to an absolute vertical ground axis
        # Generate virtual vertical point positioned straight up above the pelvis vertex
        virtual_vertical = (hip[0], hip[1] - 100)
        spine_angle = calculate_angle(shoulder, hip, virtual_vertical)

        # Flag excessive forward lean (chest dropping past 45 degrees from vertical)
        if spine_angle > 45.0:
            self.is_back_compromised = True
            self.feedback_message = "WARNING: Fix Back Angle!"
        else:
            self.is_back_compromised = False
            self.feedback_message = "Back alignment stable"

        # 2. Depth Metric: Interior knee flexion profile (Hip -> Knee -> Ankle)
        self.current_knee_angle = calculate_angle(hip, knee, ankle)

        # 3. Dynamic Repetition State Tracker
        if self.state == "UP" and self.current_knee_angle < 110.0:
            self.state = "DOWN"
        elif self.state == "DOWN" and self.current_knee_angle > 145.0:
            self.state = "UP"
            self.rep_count += 1


# =============================================================================
# DRAWING ROUTINE
# =============================================================================

def draw_landmarks_on_image(rgb_image, detection_result, mode="normal", squat_analyzer=None):
    """Draws contextual skeleton layouts based on selected processing mode."""
    annotated_image = np.copy(rgb_image)

    if not detection_result.pose_landmarks:
        return annotated_image

    height, width, _ = annotated_image.shape

    # Assign topological layout structure based on processing route intent
    connections = SQUAT_POSE_CONNECTIONS if mode == "squat" else FULL_POSE_CONNECTIONS

    for pose_landmarks in detection_result.pose_landmarks:
        landmarks_px = []
        for lm in pose_landmarks:
            landmarks_px.append((int(lm.x * width), int(lm.y * height)))

        # Update metrics if in workout analysis mode
        if mode == "squat" and squat_analyzer is not None:
            squat_analyzer.analyze_frame(landmarks_px)

        # Draw structural connecting vectors
        for start_idx, end_idx in connections:
            if start_idx < len(landmarks_px) and end_idx < len(landmarks_px):
                start_point = landmarks_px[start_idx]
                end_point = landmarks_px[end_idx]
                
                # Default connection graphics styling
                line_color = (0, 255, 0) # Green
                thickness = 2
                
                # Check for form breakdown warnings if tracking squats
                if mode == "squat" and squat_analyzer and (start_idx, end_idx) in SPINE_CONNECTIONS:
                    if squat_analyzer.is_back_compromised:
                        line_color = (0, 0, 255) # Warning Red
                        thickness = 4

                cv2.line(annotated_image, start_point, end_point, line_color, thickness)

        # Draw localized joint coordinates nodes
        for idx, (x_px, y_px) in enumerate(landmarks_px):
            if mode == "squat":
                # Omit facial nodes (0-10) and upper arm structures (13-22)
                if idx <= 10 or (idx in range(13, 23)):
                    continue
            
            cv2.circle(annotated_image, (x_px, y_px), 5, (255, 0, 0), -1)

        # Render User Interface HUD Panels
        if mode == "squat" and squat_analyzer is not None and len(landmarks_px) > 26:
            # Anchor current knee angle text directly adjacent to the active joint node location
            knee_pos = landmarks_px[26]
            cv2.putText(annotated_image, f"{int(squat_analyzer.current_knee_angle)} deg", 
                        (knee_pos[0] + 15, knee_pos[1]), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2, cv2.LINE_AA)

            # Master Telemetry Dashboard Layer
            cv2.rectangle(annotated_image, (20, 20), (480, 115), (0, 0, 0), -1)
            cv2.putText(annotated_image, f"SQUAT REPS: {squat_analyzer.rep_count}", (30, 55),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)
            
            status_color = (0, 0, 255) if squat_analyzer.is_back_compromised else (255, 255, 255)
            cv2.putText(annotated_image, f"STATUS: {squat_analyzer.feedback_message}", (30, 95),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2, cv2.LINE_AA)

    return annotated_image


# =============================================================================
# MAIN EXECUTOR PIPELINE
# =============================================================================

def main(input_path, output_path, mode="normal"):
    """Handles parsing video parameters, tracking frames, and pipeline cleanup."""
    model_path = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')

    print(f"[DEBUG] Input: {input_path}", flush=True)
    print(f"[DEBUG] Output: {output_path}", flush=True)
    print(f"[DEBUG] Mode: {mode}", flush=True)
    print(f"[DEBUG] Model path: {model_path}", flush=True)

    print("[DEBUG] Creating PoseLandmarker...", flush=True)
    try:
        options = vision.PoseLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.VIDEO 
        )
        landmarker = vision.PoseLandmarker.create_from_options(options)
        print("[DEBUG] PoseLandmarker created successfully", flush=True)
    except Exception as e:
        print(f"Error while creating the PoseLandmarker: {e}", flush=True)
        return

    print("[DEBUG] Opening video...", flush=True)
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error: Cannot open input video {input_path}", flush=True)
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[DEBUG] Video: {width}x{height}, {fps:.2f} fps, {total_frames} frames", flush=True)

    temp_output_path = output_path + ".tmp.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
    out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))

    # Contextual instantiation of optimization profiles
    squat_analyzer = SquatAnalyzer() if mode == "squat" else None
    print(f"[Engine] Starting operations. Operational processing target: {mode.upper()}", flush=True)

    frame_idx = 0
    log_interval = max(1, total_frames // 20) if total_frames > 0 else 50

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break 

        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        timestamp_ms = int((frame_idx / fps) * 1000) if fps else frame_idx
        detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)

        # Draw overlays by providing dynamic context profiles
        annotated_rgb = draw_landmarks_on_image(rgb_image, detection_result, mode, squat_analyzer)
        annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)

        out.write(annotated_bgr)
        frame_idx += 1

        if frame_idx % log_interval == 0:
            pct = (frame_idx / total_frames) * 100 if total_frames > 0 else 0
            print(f"[Progress] Frame {frame_idx}/{total_frames} ({pct:.1f}%)", flush=True)

    cap.release()
    out.release()
    print(f"[DEBUG] Frame processing complete: {frame_idx} frames written", flush=True)

    print("[FFmpeg] Commencing video compression transcode processing...", flush=True)

    ffmpeg_cmd = [
        FFMPEG_PATH,
        "-y",
        "-i", temp_output_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        output_path
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True)
        print(f"[Success] Final presentation file delivered: {output_path}", flush=True)
    except Exception as e:
        print(f"[Error] Transcoding processing failure: {e}", flush=True)
    finally:
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
            print(f"[Cleanup] Deleted temp file: {temp_output_path}", flush=True)
        if os.path.exists(input_path):
            os.remove(input_path)
            print(f"[Cleanup] Deleted input file: {input_path}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input video path")
    parser.add_argument("--output", required=True, help="Output video path")
    parser.add_argument("--mode", default="normal", choices=["normal", "squat"], help="Operational feedback profile selection")
    args = parser.parse_args()

    main(args.input, args.output, args.mode)