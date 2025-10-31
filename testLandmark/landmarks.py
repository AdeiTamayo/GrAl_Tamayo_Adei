import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import numpy as np
import cv2


model_path = './pose_landmarker_heavy.task'


# Method for visualizing the output on top of the image 
def draw_landmarks_on_image(rgb_image, detection_result):
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

# ## ============================
# ## Code for the image detection
# ## ============================


# # STEP 2: Create an PoseLandmarker object.
# base_options = python.BaseOptions(model_asset_path=model_path)
# options = vision.PoseLandmarkerOptions(
#     base_options=base_options,
#     output_segmentation_masks=True) # Default value for the running_mode = IMAGE so no need to add it as parameter
# detector = vision.PoseLandmarker.create_from_options(options)

# # STEP 3: Load the input image.
# image = mp.Image.create_from_file("media/Test_image.jpg")

# # STEP 4: Detect pose landmarks from the input image.
# detection_result = detector.detect(image)

# # STEP 5: Process the detection result. In this case, visualize it.
# annotated_image = draw_landmarks_on_image(image.numpy_view(), detection_result)

# # Resize annotated image to fit on screen
# max_width, max_height = 800, 600
# height, width = annotated_image.shape[:2]
# scale = min(max_width/width, max_height/height, 1.0)
# # Removed duplicate display block (annotated image is shown above).
# scale = min(max_width/width, max_height/height, 1.0)
# if scale < 1.0:
#   new_size = (int(width*scale), int(height*scale))
#   mp_image = cv2.resize(annotated_image, new_size, interpolation=cv2.INTER_AREA)
# # Display the image using OpenCV
# cv2.imshow('Test_image', mp_image)
# # waits for user to press any key
# # (this is necessary to avoid Python kernel form crashing)
# cv2.waitKey(0)


## ============================
## Code for the video detection
## ============================

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Read the video input
try:
  options = vision.PoseLandmarkerOptions(
      base_options=BaseOptions(model_asset_path=model_path),
      running_mode=vision.RunningMode.VIDEO)
  landmarker = vision.PoseLandmarker.create_from_options(options)
except Exception as e:
  print("Error while creating the PoseLandmarker: {}".format(e))
  exit()

# Process the video to get the frame counts and fps
videoCapture = cv2.VideoCapture("./media/Sentadilla.mp4")
frame_count = videoCapture.get(cv2.CAP_PROP_FRAME_COUNT)
fps = videoCapture.get(cv2.CAP_PROP_FPS)



# Performance settings
FRAME_SKIP = 2  # Process every 2nd frame
MAX_WIDTH, MAX_HEIGHT = 800, 600  # Display size

# Loop through the video frame by frame
for frame_idx in range(int(frame_count)):
    success, frame = videoCapture.read()
    if not success:
        print("Ignoring empty camera frame.")
        continue
    
    # Skip frames for better performance
    if frame_idx % FRAME_SKIP != 0:
        continue
    
    # Resize frame for performance and screen fit
    height, width = frame.shape[:2]
    scale = min(MAX_WIDTH/width, MAX_HEIGHT/height, 1.0)
    if scale < 1.0:
        new_size = (int(width*scale), int(height*scale))
        frame = cv2.resize(frame, new_size, interpolation=cv2.INTER_AREA)

    # Convert the BGR image to RGB.
    rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Create a MediaPipe Image object from the RGB image.
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    # Perform pose landmark detection on the input image.
    # pass an integer timestamp (milliseconds) to the API to avoid TypeError from float
    timestamp_ms = int((frame_idx / fps) * 1000) if fps else int(frame_idx)
    detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)
    # Draw the detection result on the input image.
    annotated_image = draw_landmarks_on_image(rgb_image, detection_result)

    # Convert the RGB image back to BGR for OpenCV.
    bgr_annotated_image = cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR)

    # Display the annotated image.
    cv2.imshow('MediaPipe Pose Landmarker', bgr_annotated_image)
    if cv2.waitKey(5) & 0xFF == 27:
        break
videoCapture.release()
cv2.destroyAllWindows()