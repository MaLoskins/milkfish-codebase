#!/usr/bin/env python3
import argparse
import os
from PIL import Image
import numpy as np

def load_image(image_path):
    """Loads an image from the given path, preserving transparency if present."""
    try:
        if image_path.lower().endswith('.png'):
            img = Image.open(image_path).convert('RGBA')  # Ensure PNG is in RGBA mode
        else:
            img = Image.open(image_path)  # Other formats use their native mode
        return img
    except Exception as e:
        print(f"Error loading image: {e}")
        return None

def quantize_colors(image, num_shades=16):
    """
    Reduces the number of colors in an image by quantizing each channel.
    Preserves transparency if present.
    """
    # Check image mode and handle accordingly
    has_alpha = 'A' in image.mode
    
    if has_alpha:
        # Split image into RGB and Alpha channels
        rgb_channels = image.convert('RGB')
        alpha = image.split()[-1]  # Extract the alpha channel
    else:
        rgb_channels = image.convert('RGB')
    
    # Convert RGB to numpy array for manipulation
    img_np = np.array(rgb_channels)
    
    # Count original unique colors
    original_colors = len(np.unique(img_np.reshape(-1, 3), axis=0))
    print(f"Original image has {original_colors} unique colors")
    
    # Normalize pixel values to [0, 1] range
    img_normalized = img_np / 255.0
    
    # Quantize the image by limiting the color range
    img_quantized = np.floor(img_normalized * num_shades) / (num_shades - 1)
    
    # Convert back to [0, 255] range
    img_quantized = (img_quantized * 255).astype(np.uint8)
    
    # Convert back to an image
    if has_alpha:
        img_result = Image.fromarray(img_quantized).convert('RGBA')
        img_result.putalpha(alpha)  # Reattach the original alpha channel
    else:
        img_result = Image.fromarray(img_quantized)
    
    # Count resulting unique colors
    result_colors = len(np.unique(img_quantized.reshape(-1, 3), axis=0))
    print(f"Quantized image now has {result_colors} unique colors")
    
    return img_result

def save_image(image, output_path):
    """Saves the processed image to the given output path."""
    directory = os.path.dirname(output_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)
    
    image.save(output_path)
    print(f"Quantized image saved as {output_path}")

def main():
    parser = argparse.ArgumentParser(description='Reduce the number of colors in an image.')
    parser.add_argument('image_path', type=str, help='Path to the input image')
    parser.add_argument('--colors', type=int, default=16, 
                        help='Number of color shades per channel (default: 16)')
    parser.add_argument('--output', type=str, default=None, 
                        help='Path for the output image')
    
    args = parser.parse_args()
    
    # Determine output path if not specified
    if args.output is None:
        file_name, file_ext = os.path.splitext(args.image_path)
        args.output = f"{file_name}_quantized_{args.colors}{file_ext}"
    
    # Process the image
    image = load_image(args.image_path)
    if image:
        quantized_image = quantize_colors(image, args.colors)
        save_image(quantized_image, args.output)

if __name__ == "__main__":
    main()