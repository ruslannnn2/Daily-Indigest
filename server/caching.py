import csv
from pathlib import Path
from typing import Optional, Tuple, Dict

CACHE_FILE = Path("geocache.csv")

_cache = Dict[str, Tuple[float, float, float, float]]

def load_cache() -> None:
    global _cache
    if CACHE_FILE.exists():
        with open(CACHE_FILE, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    _cache[row['location_text']] = (
                        float(row['south']),
                        float(row['north']),
                        float(row['west']),
                        float(row['east'])
                    )
                except ValueError:  
                    continue   
    else:
        CACHE_FILE.touch()
    print(f"Loaded {len(_cache)} items from cache")

def lookup(location_text: str) -> Optional[Tuple[float, float, float, float]]:
    """Return cached bounding box if it exists."""
    return _cache.get(location_text)

def save(location_text: str, bbox: Tuple[float, float, float, float]) -> None:
    """Append a new location + bounding box to cache CSV and memory."""
    _cache[location_text] = bbox
    write_header = not CACHE_FILE.exists() or CACHE_FILE.stat().st_size == 0
    with open(CACHE_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["location_text", "south", "north", "west", "east"])
        if write_header:
            writer.writeheader()
        writer.writerow({
            "location_text": location_text,
            "south": bbox[0],
            "north": bbox[1],
            "west": bbox[2],
            "east": bbox[3],
        })
    print(f"[Cache] Stored: {location_text} -> {bbox}")