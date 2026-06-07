import sys
from PIL import Image

def crop_logo(img_path, out_path):
    img = Image.open(img_path)
    
    # We want to crop out the text at the bottom.
    # Let's crop it tightly to the non-transparent bounding box first.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    width, height = img.size
    
    # The logo seems to be the top 50-60%.
    # Let's crop the top 55% of the image.
    crop_height = int(height * 0.60)
    img = img.crop((0, 0, width, crop_height))
    
    # Crop again to remove empty space
    bbox2 = img.getbbox()
    if bbox2:
        img = img.crop(bbox2)
        
    img.save(out_path, "PNG")
    print("Cropped and saved to", out_path)

if __name__ == "__main__":
    crop_logo(sys.argv[1], sys.argv[2])
