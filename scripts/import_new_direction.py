from pathlib import Path

from PIL import Image


ROOT = Path(r"C:\Users\jeova\OneDrive\Desktop\Cardapaiao digitalweb")
SOURCE = ROOT / "nova direcao" / "assets visuais" / "Hanmburugeres"
TARGET = ROOT / "assets" / "new-direction"

NAMES = [
    "doutor-burger",
    "smash-cheddar",
    "bbq-bacon",
    "chicken-crispy",
    "veggie-doctor",
    "combo-doutor",
    "batata-cheddar-bacon",
]


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    files = sorted(SOURCE.glob("*.png"))
    for name, source in zip(NAMES, files):
        image = Image.open(source).convert("RGB").resize((780, 780), Image.Resampling.LANCZOS)
        image.save(TARGET / f"{name}.webp", "WEBP", quality=88, method=6)
        print(TARGET / f"{name}.webp")


if __name__ == "__main__":
    main()
