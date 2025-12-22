import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import numpy as np
import cv2
import time
import math

# OPTIMIZATION 1: Use the "Full" model. 
# It is the best balance between speed (Lite) and accuracy (Heavy).
model_path = './models/pose_landmarker_lite.task'

# Global variables
latest_result = None
result_lock = False
reps = 0
current_stage = "UP" # Default to UP to avoid NoneType issues
squat_start_time = 0
timestamp_bottom = 0
last_eccentric = 0
last_concentric = 0
feedback = "Stand in frame"

# OPTIMIZATION 2: Smoothing variables
# 0.7 means "keep 30% of old value, take 70% of new value"
# Lower = smoother but more lag. Higher = more responsive but jittery.
SMOOTHING_ALPHA = 0.7 
prev_left_angle = 180
prev_right_angle = 180

def calculate_angle(point1, point2, point3):
    vector1 = np.array([point1[0] - point2[0], point1[1] - point2[1]])
    vector2 = np.array([point3[0] - point2[0], point3[1] - point2[1]])
    
    norm1 = np.linalg.norm(vector1)
    norm2 = np.linalg.norm(vector2)
    
    if norm1 == 0 or norm2 == 0: return 180.0
    
    cosine_angle = np.dot(vector1, vector2) / (norm1 * norm2)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

def draw_landmarks_on_image(rgb_image, detection_result):
    global prev_left_angle, prev_right_angle, reps, current_stage, squat_start_time, timestamp_bottom, last_eccentric, last_concentric, feedback
    
    if detection_result is None or not detection_result.pose_landmarks:
        return rgb_image
    
    annotated_image = rgb_image.copy()
    h, w = rgb_image.shape[:2]
    
    squat_landmarks = [11, 12, 23, 24, 25, 26, 27, 28]
    
    for pose_landmarks in detection_result.pose_landmarks:
        if len(pose_landmarks) > 28:
            # Coordinates
            left_hip = (int(pose_landmarks[23].x * w), int(pose_landmarks[23].y * h))
            left_knee = (int(pose_landmarks[25].x * w), int(pose_landmarks[25].y * h))
            left_ankle = (int(pose_landmarks[27].x * w), int(pose_landmarks[27].y * h))
            
            right_hip = (int(pose_landmarks[24].x * w), int(pose_landmarks[24].y * h))
            right_knee = (int(pose_landmarks[26].x * w), int(pose_landmarks[26].y * h))
            right_ankle = (int(pose_landmarks[28].x * w), int(pose_landmarks[28].y * h))
            
            # Calculate raw angles
            raw_left = calculate_angle(left_hip, left_knee, left_ankle)
            raw_right = calculate_angle(right_hip, right_knee, right_ankle)
            
            # OPTIMIZATION 3: Apply Smoothing
            # This makes the numbers stable even if detection jitters
            smooth_left = (SMOOTHING_ALPHA * raw_left) + ((1 - SMOOTHING_ALPHA) * prev_left_angle)
            smooth_right = (SMOOTHING_ALPHA * raw_right) + ((1 - SMOOTHING_ALPHA) * prev_right_angle)
            
            prev_left_angle = smooth_left
            prev_right_angle = smooth_right
            
            avg_knee_angle = (smooth_left + smooth_right) / 2

            # --- Advanced State Machine ---
            # 1. UP -> DESCENDING
            if current_stage == "UP" and avg_knee_angle < 160:
                current_stage = "DESCENDING"
                squat_start_time = time.time()
                feedback = "Going Down..."
            
            # 2. DESCENDING -> BOTTOM (Hit Depth)
            elif current_stage == "DESCENDING":
                if avg_knee_angle < 90:
                    current_stage = "BOTTOM"
                    timestamp_bottom = time.time()
                    if squat_start_time > 0:
                        last_eccentric = timestamp_bottom - squat_start_time
                    feedback = "Good Depth!"
                elif avg_knee_angle > 160:
                    # Aborted rep
                    current_stage = "UP"
                    feedback = "Partial Rep"
                    squat_start_time = 0

            # 3. BOTTOM -> UP (Finished Rep)
            elif current_stage == "BOTTOM":
                if avg_knee_angle > 160:
                    current_stage = "UP"
                    if timestamp_bottom > 0:
                        last_concentric = time.time() - timestamp_bottom
                    reps += 1
                    feedback = "Rep Complete"
                    squat_start_time = 0
                    timestamp_bottom = 0
            
            # --- Visual Bar for Depth ---
            # Map angle (180 to 70) to bar height (100 to 400)
            bar_val = np.interp(avg_knee_angle, [70, 180], [400, 100])
            bar_color = (0, 255, 0) if avg_knee_angle < 90 else (0, 255, 255)
            
            # Draw Bar
            cv2.rectangle(annotated_image, (580, 100), (600, 400), (255, 255, 255), 1)
            cv2.rectangle(annotated_image, (580, int(bar_val)), (600, 400), bar_color, -1)
            
            # Draw Info Box
            cv2.rectangle(annotated_image, (0, 0), (450, 100), (245, 117, 16), -1)
            
            # Reps
            cv2.putText(annotated_image, 'REPS', (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
            cv2.putText(annotated_image, str(reps), (15, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
            
            # Eccentric (Down)
            cv2.putText(annotated_image, 'ECC', (100, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
            cv2.putText(annotated_image, f'{last_eccentric:.1f}s', (90, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

            # Concentric (Up)
            cv2.putText(annotated_image, 'CON', (200, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
            cv2.putText(annotated_image, f'{last_concentric:.1f}s', (190, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)

            # Feedback
            cv2.putText(annotated_image, feedback, (15, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
            
            # Draw Angles
            cv2.putText(annotated_image, f'{int(smooth_left)}', (left_knee[0]-40, left_knee[1]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            cv2.putText(annotated_image, f'{int(smooth_right)}', (right_knee[0]+10, right_knee[1]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            
            # Status Logic
            if avg_knee_angle < 90:
                depth_status = "DEEP SQUAT"
                depth_color = (0, 255, 0)
            elif avg_knee_angle < 110:
                depth_status = "PARALLEL"
                depth_color = (0, 255, 255)
            else:
                depth_status = "STANDING"
                depth_color = (0, 165, 255)
            
            cv2.putText(annotated_image, f'Angle: {int(avg_knee_angle)}', (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(annotated_image, depth_status, (10, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.8, depth_color, 2)
        
        # Draw Skeleton
        connections = [(11, 12), (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28)]
        for start_idx, end_idx in connections:
            if start_idx < len(pose_landmarks) and end_idx < len(pose_landmarks):
                start = pose_landmarks[start_idx]
                end = pose_landmarks[end_idx]
                cv2.line(annotated_image, (int(start.x*w), int(start.y*h)), (int(end.x*w), int(end.y*h)), (255, 255, 255), 2)
                
        for idx in squat_landmarks:
            if idx < len(pose_landmarks):
                lm = pose_landmarks[idx]
                cv2.circle(annotated_image, (int(lm.x*w), int(lm.y*h)), 5, (0, 255, 0), -1)
    
    return annotated_image

# Setup MediaPipe
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
PoseLandmarkerResult = mp.tasks.vision.PoseLandmarkerResult
VisionRunningMode = mp.tasks.vision.RunningMode

def result_callback(result, output_image, timestamp_ms):
    global latest_result, result_lock
    if not result_lock:
        latest_result = result

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.LIVE_STREAM,
    num_poses=1,
    min_pose_detection_confidence=0.6, # Slightly higher confidence threshold
    min_tracking_confidence=0.6,
    result_callback=result_callback)

print("Initializing camera...")
cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if not cam.isOpened(): cam = cv2.VideoCapture(1, cv2.CAP_DSHOW)
if not cam.isOpened(): exit(1)

# OPTIMIZATION 4: Use standard resolution. 
# Upscaling (scale=1.25) slows down detection significantly.
cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

with PoseLandmarker.create_from_options(options) as landmarker:
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = None
    recording = False
    
    cv2.namedWindow('Pose Landmarker')
    fps_time = time.time()
    fps_counter = 0
    fps = 0
    
    print("Ready. 'r' to record, 'q' to quit.")

    while True:
        ret, frame = cam.read()
        if not ret: continue

        # OPTIMIZATION 5: Removed the manual sleep(0.04) and manual timestamp increment.
        # This allows the loop to run as fast as the camera permits.
        
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Use system time for accurate tracking
        timestamp_ms = int(time.time() * 1000)
        
        if not result_lock:
            try:
                landmarker.detect_async(mp_image, timestamp_ms)
            except Exception:
                pass # Drop frame if busy

        result_lock = True
        annotated_frame = draw_landmarks_on_image(frame, latest_result)
        result_lock = False

        # FPS Counter
        fps_counter += 1
        if time.time() - fps_time > 1:
            fps = fps_counter
            fps_counter = 0
            fps_time = time.time()
        
        cv2.putText(annotated_frame, f'FPS: {fps}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        if recording and out: out.write(annotated_frame)
        cv2.imshow('Pose Landmarker', annotated_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'): break
        elif key == ord('r'):
            if not recording:
                ts = time.strftime("%Y%m%d-%H%M%S")
                out = cv2.VideoWriter(f'output_{ts}.mp4', fourcc, 20.0, (frame_width, frame_height))
                recording = True
                print("Recording...")
            else:
                if out: out.release()
                recording = False
                print("Stopped.")

if out: out.release()
cam.release()
cv2.destroyAllWindows()
