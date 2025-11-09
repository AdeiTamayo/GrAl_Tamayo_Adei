import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import numpy as np
import cv2
import time
import math

model_path = './models/pose_landmarker_lite.task'

# Global variable to store the latest detection result
latest_result = None
result_lock = False

def calculate_angle(point1, point2, point3):
    """
    Calculate the angle between three points.
    point2 is the vertex of the angle.
    Returns angle in degrees.
    """
    # Calculate vectors
    vector1 = np.array([point1[0] - point2[0], point1[1] - point2[1]])
    vector2 = np.array([point3[0] - point2[0], point3[1] - point2[1]])
    
    # Calculate angle using dot product
    cosine_angle = np.dot(vector1, vector2) / (np.linalg.norm(vector1) * np.linalg.norm(vector2))
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    
    return np.degrees(angle)

def draw_landmarks_on_image(rgb_image, detection_result):
    if detection_result is None or not detection_result.pose_landmarks:
        return rgb_image
    
    annotated_image = rgb_image.copy()
    h, w = rgb_image.shape[:2]
    
    # Landmarks relevant for squat analysis
    squat_landmarks = [
        11, 12,  # Shoulders
        13, 14,  # Elbows (optional, for arm position)
        23, 24,  # Hips
        25, 26,  # Knees
        27, 28   # Ankles
    ]
    
    for pose_landmarks in detection_result.pose_landmarks:
        # Extract key points for angle calculation
        if len(pose_landmarks) > 28:
            # Left side: hip(23) -> knee(25) -> ankle(27)
            left_hip = (int(pose_landmarks[23].x * w), int(pose_landmarks[23].y * h))
            left_knee = (int(pose_landmarks[25].x * w), int(pose_landmarks[25].y * h))
            left_ankle = (int(pose_landmarks[27].x * w), int(pose_landmarks[27].y * h))
            
            # Right side: hip(24) -> knee(26) -> ankle(28)
            right_hip = (int(pose_landmarks[24].x * w), int(pose_landmarks[24].y * h))
            right_knee = (int(pose_landmarks[26].x * w), int(pose_landmarks[26].y * h))
            right_ankle = (int(pose_landmarks[28].x * w), int(pose_landmarks[28].y * h))
            
            # Calculate knee angles
            left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
            right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)
            
            # Average knee angle
            avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
            
            # Draw angle text on knees
            cv2.putText(annotated_image, f'{int(left_knee_angle)}°', 
                       (left_knee[0] - 40, left_knee[1]), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            cv2.putText(annotated_image, f'{int(right_knee_angle)}°', 
                       (right_knee[0] + 10, right_knee[1]), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            
            # Display squat depth status
            if avg_knee_angle < 90:
                depth_status = "DEEP SQUAT"
                depth_color = (0, 255, 0)  # Green
            elif avg_knee_angle < 110:
                depth_status = "PARALLEL"
                depth_color = (0, 255, 255)  # Yellow
            else:
                depth_status = "PARTIAL"
                depth_color = (0, 165, 255)  # Orange
            
            cv2.putText(annotated_image, f'Knee Angle: {int(avg_knee_angle)}°', 
                       (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(annotated_image, depth_status, 
                       (10, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.8, depth_color, 2)
        
        # Draw only squat-relevant landmarks
        for idx in squat_landmarks: 
            if idx < len(pose_landmarks):
                landmark = pose_landmarks[idx]
                x = int(landmark.x * w)
                y = int(landmark.y * h)
                cv2.circle(annotated_image, (x, y), 5, (0, 255, 0), -1)
        
        # Draw connections for squat form
        connections = [
            (11, 12),  # Shoulder line
            (11, 13),  # Left arm
            (12, 14),  # Right arm
            (11, 23),  # Left torso
            (12, 24),  # Right torso
            (23, 24),  # Hip line
            (23, 25),  # Left thigh
            (24, 26),  # Right thigh
            (25, 27),  # Left shin
            (26, 28)   # Right shin
        ]
        
        for start_idx, end_idx in connections:
            if (start_idx < len(pose_landmarks) and 
                end_idx < len(pose_landmarks) and
                start_idx in squat_landmarks and 
                end_idx in squat_landmarks):
                start = pose_landmarks[start_idx]
                end = pose_landmarks[end_idx]
                start_point = (int(start.x * w), int(start.y * h))
                end_point = (int(end.x * w), int(end.y * h))
                cv2.line(annotated_image, start_point, end_point, (255, 255, 255), 2)
    
    return annotated_image


## ============================
## Code for the livestream detection
## ============================

# STEP 2: Create an PoseLandmarker object.
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
PoseLandmarkerResult = mp.tasks.vision.PoseLandmarkerResult
VisionRunningMode = mp.tasks.vision.RunningMode

# Create a pose landmarker instance with the live stream mode:
def result_callback(result: PoseLandmarkerResult, output_image: mp.Image, timestamp_ms: int):
    global latest_result, result_lock
    if not result_lock:
        latest_result = result

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.LIVE_STREAM,
    num_poses=2,
    result_callback=result_callback)

print("Initializing camera...")
# Try different camera backends
cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # DirectShow for Windows

if not cam.isOpened():
    print("Trying alternative camera index...")
    cam = cv2.VideoCapture(1, cv2.CAP_DSHOW)

if not cam.isOpened():
    print("ERROR: Cannot open camera. Please check:")
    print("  1. Camera is connected")
    print("  2. No other application is using the camera")
    print("  3. Camera permissions are granted")
    exit(1)

# Give camera time to initialize
time.sleep(2)

# Get the default frame width and height
frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"Camera initialized: {frame_width}x{frame_height}")

scale = 1.25  # make the output a bit larger
out_width = int(frame_width * scale)
out_height = int(frame_height * scale)

with PoseLandmarker.create_from_options(options) as landmarker:
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = None
    recording = False

    cv2.namedWindow('Pose Landmarker')

    frame_timestamp_ms = 0
    fps_time = time.time()
    fps_counter = 0
    fps = 0

    print("\nControls:")
    print("  'r' - Start/Stop Recording")
    print("  'q' - Quit")
    print("\nCamera ready. Starting detection...")

    while True:
        ret, frame = cam.read()
        if not ret:
            print("Warning: Failed to grab frame, retrying...")
            time.sleep(0.1)
            continue

        # Resize the frame for slightly larger display/output
        frame = cv2.resize(frame, (out_width, out_height))

        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Throttle frame rate (~20-25 FPS)
        time.sleep(0.04)  # 40 ms per frame ≈ 25 FPS

        # Only call detect_async if previous inference is done
        if not result_lock:
            frame_timestamp_ms += 40
            try:
                landmarker.detect_async(mp_image, frame_timestamp_ms)
            except Exception as e:
                print(f"Detection error: {e}")

        # Lock while drawing landmarks
        result_lock = True
        annotated_frame = draw_landmarks_on_image(frame, latest_result)
        result_lock = False

        # Calculate FPS for overlay
        fps_counter += 1
        if time.time() - fps_time > 1:
            fps = fps_counter
            fps_counter = 0
            fps_time = time.time()

        cv2.putText(annotated_frame, f'FPS: {fps}', (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # Handle recording
        if recording and out is not None:
            out.write(annotated_frame)

        # Display window
        cv2.imshow('Pose Landmarker', annotated_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            print("Quitting...")
            break
        elif key == ord('r'):
            if not recording:
                timestamp = time.strftime("%Y%m%d-%H%M%S")
                out = cv2.VideoWriter(f'output_{timestamp}.mp4', fourcc, 20.0, (out_width, out_height))
                recording = True
                print(f"Started recording to output_{timestamp}.mp4")
            else:
                if out is not None:
                    out.release()
                    out = None
                recording = False
                print("Stopped recording")


# Cleanup
if out is not None:
    out.release()
cam.release()
cv2.destroyAllWindows()
print("Cleanup complete.")