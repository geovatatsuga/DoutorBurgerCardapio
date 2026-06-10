from pathlib import Path

from PIL import Image


PRODUCT_DIR = Path("assets/products")


def main() -> None:
    for source in PRODUCT_DIR.glob("*.png"):
        if source.name == "product-sheet.png":
            continue
        target = source.with_suffix(".webp")
        image = Image.open(source).convert("RGB").resize((720, 720), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=86, method=6)
        print(target)


if __name__ == "__main__":
    main()
