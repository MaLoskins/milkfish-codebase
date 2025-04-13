#!/usr/bin/env python3
import argparse
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans
import os

def quantize_colors(image_path, num_colors, output_path=None):
    """
    Reduce the number of colors in an image to the specified count.
    
    Args:
        image_path (str): Path to the input image
        num_colors (int): Number of colors to reduce to
        output_path (str, optional): Path for the output image. If not provided,
                                    will use input name with "_quantized_{num_colors}" suffix
    
    Returns:
        str: Path to the quantized image
    """
    # Load the image
    try:
        img = Image.open(image_path)
        # Convert to RGBA if it has transparency, otherwise RGB
        if img.mode == 'RGBA':
            img_mode = 'RGBA'
        else:
            img_mode = 'RGB'
            img = img.convert('RGB')
    except Exception as e:
        print(f"Error loading image: {e}")
        return None
    
    # Get image dimensions and prepare data for clustering
    width, height = img.size
    
    # Convert image to numpy array
    pixels = np.array(img)
    original_shape = pixels.shape
    
    # Reshape for KMeans - we need a 2D array where each row is a pixel
    if img_mode == 'RGBA':
        # For RGBA, we only cluster on RGB values, keep alpha channel separate
        pixels_rgb = pixels[:,:,:3]
        alpha = pixels[:,:,3]
        flattened_pixels = pixels_rgb.reshape(-1, 3)
    else:
        flattened_pixels = pixels.reshape(-1, 3)
    
    # Count original number of unique colors
    unique_colors = np.unique(flattened_pixels, axis=0)
    original_color_count = len(unique_colors)
    print(f"Original image has {original_color_count} unique colors")
    
    # If original color count is less than requested, just use that
    if original_color_count <= num_colors:
        print(f"Image already has fewer colors ({original_color_count}) than requested ({num_colors})")
        num_colors = original_color_count
    
    # Apply KMeans clustering
    print(f"Reducing to {num_colors} colors...")
    kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
    labels = kmeans.fit_predict(flattened_pixels)
    centers = kmeans.cluster_centers_
    
    # Convert centers to integers (valid RGB values)
    centers = centers.astype(np.uint8)
    
    # Map each pixel to its closest center
    quantized_pixels = centers[labels]
    
    # Reshape back to original image shape
    if img_mode == 'RGBA':
        # Reshape the RGB part
        quantized_pixels = quantized_pixels.reshape(original_shape[:2] + (3,))
        
        # Add alpha channel back
        quantized_pixels_rgba = np.zeros(original_shape, dtype=np.uint8)
        quantized_pixels_rgba[:,:,:3] = quantized_pixels
        quantized_pixels_rgba[:,:,3] = alpha
        quantized_pixels = quantized_pixels_rgba
    else:
        quantized_pixels = quantized_pixels.reshape(original_shape)
    
    # Create a new image from the quantized array
    quantized_img = Image.fromarray(quantized_pixels, mode=img_mode)
    
    # Save the quantized image
    if output_path is None:
        file_name, file_ext = os.path.splitext(image_path)
        output_path = f"{file_name}_quantized_{num_colors}{file_ext}"
    
    quantized_img.save(output_path)
    print(f"Quantized image saved to: {output_path}")
    
    return output_path

def main():
    parser = argparse.ArgumentParser(description='Reduce the number of colors in an image.')
    parser.add_argument('image_path', type=str, help='Path to the input image')
    parser.add_argument('--colors', type=int, default=16, help='Number of colors to reduce to (default: 16)')
    parser.add_argument('--output', type=str, default=None, help='Path for the output image')
    
    args = parser.parse_args()
    
    quantize_colors(args.image_path, args.colors, args.output)

if __name__ == "__main__":
    main()