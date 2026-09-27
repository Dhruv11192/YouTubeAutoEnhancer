import os
import zlib
import struct

def make_png(width, height, red=255, green=0, blue=0):
    # Generates a solid/bordered red rounded icon with a white play triangle
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter type 0
        for x in range(width):
            # Check if inside play triangle
            nx = x / width
            ny = y / height

            # Rounded rect mask
            corner_r = 0.2
            dx = min(nx, 1.0 - nx)
            dy = min(ny, 1.0 - ny)
            in_rect = True
            if dx < corner_r and dy < corner_r:
                if ((dx - corner_r)**2 + (dy - corner_r)**2) > corner_r**2:
                    in_rect = False

            if not in_rect:
                raw_data.extend([0, 0, 0, 0]) # Transparent
                continue

            # Play triangle in center (white)
            # Center is around (0.5, 0.5), bounds (0.38, 0.3) to (0.68, 0.5) to (0.38, 0.7)
            if 0.38 <= nx <= 0.68:
                tri_top = 0.5 - (nx - 0.38) * (0.2 / 0.3)
                tri_bottom = 0.5 + (nx - 0.38) * (0.2 / 0.3)
                if tri_top <= ny <= tri_bottom:
                    raw_data.extend([255, 255, 255, 255]) # White triangle
                    continue

            # Background: YouTube Red (#FF0000)
            raw_data.extend([235, 32, 32, 255])

    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc

    # IDAT chunk
    compressed = zlib.compress(bytes(raw_data), 9)
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc

    # IEND chunk
    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png += struct.pack('>I', 0) + b'IEND' + iend_crc

    return png

output_dir = '/Users/dhruv/YouTubeAutoEnhancer/YouTubeAutoEnhancer/Extension/Resources/images'
os.makedirs(output_dir, exist_ok=True)

for size in [16, 32, 48, 128, 512]:
    png_bytes = make_png(size, size)
    filepath = os.path.join(output_dir, f'icon-{size}.png')
    with open(filepath, 'wb') as f:
        f.write(png_bytes)
    print(f'Generated {filepath}')
