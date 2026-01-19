import mediapipe as mp 
from mediapipe.tasks.python import vision 
import numpy as np 
import cv2 
import argparse
import os

"""
This script processes a video file to detect human pose landmarks using MediaPipe 
and saves the annotated video to a specified output path.
"""

# List of tuples representing pairs of landmark indices that should be connected by lines
POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10), (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21),
    (17, 19), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),
    (27, 29), (28, 30), (29, 31), (30, 32), (27, 31), (28, 32)
]


def draw_landmarks_on_image(rgb_image, detection_result):
    """
    Draws detected pose landmarks and their connections onto the provided image.
    """
    # Create a copy of the input image to avoid modifying the original data
    annotated_image = np.copy(rgb_image)

    if not detection_result.pose_landmarks:
        return annotated_image

    height, width, _ = annotated_image.shape

    # Iterate through each detected person's pose landmarks
    for pose_landmarks in detection_result.pose_landmarks:
        # landmarks_px format: [(x1, y1), (x2, y2), ...] where index is the landmark ID.
        # We convert normalized 0.0-1.0 coordinates to actual pixel values for drawing.
        landmarks_px = []
        for lm in pose_landmarks:
            x_px = int(lm.x * width)
            y_px = int(lm.y * height)
            landmarks_px.append((x_px, y_px))

        # Draw lines between connected landmarks based on POSE_CONNECTIONS.
        # We compare start_idx and end_idx to len(landmarks_px) to ensure the indices 
        # exist in the current detection, preventing crashes (IndexError) if the 
        # model returns fewer landmarks than expected.
        for start_idx, end_idx in POSE_CONNECTIONS:
            if start_idx < len(landmarks_px) and end_idx < len(landmarks_px):
                start_point = landmarks_px[start_idx]
                end_point = landmarks_px[end_idx]
                # Draw a green line with thickness 2
                cv2.line(annotated_image, start_point, end_point, (0, 255, 0), 2) # Input in BGR format, Starting point, Ending point, Color (Green), Thickness

        # Draw a solid blue circle at each landmark point to highlight the joints.
        for (x_px, y_px) in landmarks_px:
            cv2.circle(annotated_image, (x_px, y_px), 5, (255, 0, 0), -1) # Input in BGR format, Center, Radius, Color (Blue), Filled circle (-1 for filled)

    return annotated_image


def main(input_path, output_path):
    """
    Main function to handle video reading, pose detection, and writing the output video.
    """
    # Construct the absolute path to the MediaPipe model file
    model_path = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')

    # Initialize the PoseLandmarker with specific options for video processing
    try:
        options = vision.PoseLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.VIDEO # Optimized for sequential video frames
        )
        landmarker = vision.PoseLandmarker.create_from_options(options)
    except Exception as e:
        print(f"Error while creating the PoseLandmarker: {e}")
        return

    # Open the input video file using OpenCV
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error: Cannot open input video {input_path}")
        return

    # Extract video metadata: frames per second, width, and height
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Define the codec and create a VideoWriter object to save the output
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') # MP4 codec
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0

    # Loop through the video until it ends or is closed
    while cap.isOpened():
        # Read the next frame from the video
        success, frame = cap.read()
        if not success:
            break # End of video

        # Convert BGR (OpenCV default) to RGB (MediaPipe requirement)
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # Wrap the numpy array in a MediaPipe Image object
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        # Calculate the timestamp for the current frame in milliseconds
        timestamp_ms = int((frame_idx / fps) * 1000) if fps else frame_idx
        # Perform pose detection on the current frame
        detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)

        # Draw the detected landmarks on the RGB frame
        annotated_rgb = draw_landmarks_on_image(rgb_image, detection_result)
        # Convert the annotated frame back to BGR for saving with OpenCV
        annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)

        # Write the processed frame to the output video file
        out.write(annotated_bgr)
        frame_idx += 1

    # Release the video capture and writer objects to free up system resources
    cap.release()
    out.release()


if __name__ == "__main__":
    # Set up command-line argument parsing
    parser = argparse.ArgumentParser()
    # Define required arguments for input and output file paths
    parser.add_argument("--input", required=True, help="Input video path")
    parser.add_argument("--output", required=True, help="Output video path")
    args = parser.parse_args()

    # Execute the main processing function with provided arguments
    main(args.input, args.output)