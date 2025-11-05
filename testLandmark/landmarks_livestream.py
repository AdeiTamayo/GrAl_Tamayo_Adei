import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import numpy as np
import cv2
import time

model_path = './pose_landmarker_heavy.task'

# Global variable to store the latest detection result
latest_result = None
result_lock = False

# Method for visualizing the output on top of the image 
def draw_landmarks_on_image(rgb_image, detection_result):
    if detection_result is None or detection_result.pose_landmarks is None:
        return rgb_image
    
    pose_landmarks_list = detection_result.pose_landmarks
    annotated_image = np.copy(rgb_image)

    # Loop through the detected poses to visualize.
    for idx in range(len(pose_landmarks_list)):
        pose_landmarks = pose_landmarks_list[idx]

        # Draw the pose landmarks.
        pose_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
        pose_landmarks_proto.landmark.extend([
            landmark_pb2.NormalizedLandmark(x=landmark.x, y=landmark.y, z=landmark.z) for landmark in pose_landmarks
        ])
        solutions.drawing_utils.draw_landmarks(
            annotated_image,
            pose_landmarks_proto,
            solutions.pose.POSE_CONNECTIONS,
            solutions.drawing_styles.get_default_pose_landmarks_style())
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
    print("Cannot open camera")
    exit()

# Give camera time to initialize
time.sleep(2)

# Get the default frame width and height
frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))


with PoseLandmarker.create_from_options(options) as landmarker:
    # Define the codec and create VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = None
    recording = False

    # Create window
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
        
        # if frame is read correctly ret is True
        if not ret:
            print("Can't receive frame (stream end?). Exiting ...")
            break


        # Convert BGR to RGB
        #rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Convert the frame to MediaPipe's Image object
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame) #rgb_frame

        # Send live image data to perform pose landmarking
        frame_timestamp_ms += 33  # Approximate 30 FPS
        
        try:
            landmarker.detect_async(mp_image, frame_timestamp_ms)
        except Exception as e:
            print(f"Detection error: {e}")

        # Draw landmarks on the frame
        result_lock = True
        annotated_frame = draw_landmarks_on_image(frame, latest_result)
        result_lock = False

        # Calculate FPS
        fps_counter += 1
        if time.time() - fps_time > 1:
            fps = fps_counter
            fps_counter = 0
            fps_time = time.time()

        # Add text overlays (GUI elements)
        cv2.putText(annotated_frame, f'FPS: {fps}', (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        status_text = "Recording..." if recording else "Not Recording"
        status_color = (0, 0, 255) if recording else (255, 255, 255)
        cv2.putText(annotated_frame, status_text, (10, 70), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)

        cv2.putText(annotated_frame, "Press 'r' to record | 'q' to quit", (10, frame_height - 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        # Write frame if recording
        if recording and out is not None:
            out.write(annotated_frame)

        # Display the frame
        cv2.imshow('Pose Landmarker', annotated_frame)

        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            print("Quitting...")
            break
        elif key == ord('r'):
            if not recording:
                # Start recording
                timestamp = time.strftime("%Y%m%d-%H%M%S")
                out = cv2.VideoWriter(f'output_{timestamp}.mp4', fourcc, 20.0, 
                                     (frame_width, frame_height))
                recording = True
                print(f"Started recording to output_{timestamp}.mp4")
            else:
                # Stop recording
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
