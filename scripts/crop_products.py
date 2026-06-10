from pathlib import Path

from PIL import Image


SOURCE = Path(
    r"C:\Users\jeova\.codex\generated_images\019e60a9-6d0b-7b72-bd27-f008572085f8\ig_08b8884f73d9d112016a14ac39475881949db5bb0fb63ed9c2.png"
)
OUT_DIR = Path(r"C:\Users\jeova\OneDrive\Desktop\Cardapaiao digitalweb\assets\products")

NAMES = [
    "doutor-burger",
    "smash-cheddar",
    "bbq-bacon",
    "chicken-crispy",
    "veggie-burger",
    "batata-cheddar-bacon",
    "combo-doutor",
    "brownie",
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE)
    image.save(OUT_DIR / "product-sheet.png")

    width, height = image.size
    cell_width = width // 4
    cell_height = height // 2
    pad_x = 22
    pad_y = 20

    index = 0
    for row in range(2):
        for col in range(4):
            x0 = col * cell_width + pad_x
            y0 = row * cell_height + pad_y
            x1 = (col + 1) * cell_width - pad_x
            y1 = (row + 1) * cell_height - pad_y
            cropped = image.crop((x0, y0, x1, y1)).resize((900, 900), Image.Resampling.LANCZOS)
            cropped.save(OUT_DIR / f"{NAMES[index]}.png")
            index += 1

    print(f"cropped {index} product images into {OUT_DIR}")


if __name__ == "__main__":
    main()
