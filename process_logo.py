import sys
from PIL import Image

def make_transparent(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # Tolerance for "white"
    for item in datas:
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            # White-ish pixel, make transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    
    # We want to crop it to just the logo, removing the text if possible, but the user said "quita las letras". 
    # If the text is below the logo, we can crop the top half.
    # Let's crop it tightly to the non-transparent bounding box first.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # The text "TeamFlow" is at the bottom. We can crop the bottom 40% roughly, or find the gap.
    # A safer approach is to just use CSS object-fit or crop manually.
    # Let's try to crop the bottom half if it's tall.
    width, height = img.size
    # Assuming logo is square and text is below it.
    if height > width * 0.8:
        # Crop the bottom part
        img = img.crop((0, 0, width, int(width*0.85)))
        
    img.save(out_path, "PNG")
    print("Saved to", out_path)

if __name__ == "__main__":
    make_transparent(sys.argv[1], sys.argv[2])
