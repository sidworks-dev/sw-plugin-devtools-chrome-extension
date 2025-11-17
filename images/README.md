# Icons

To complete the Chrome extension, you need to create PNG icons from the provided SVG.

## Required Icon Sizes

- `icon16.png` - 16x16px (toolbar icon, active state)
- `icon48.png` - 48x48px (extension management page)
- `icon128.png` - 128x128px (Chrome Web Store)
- `icon-off16.png` - 16x16px (toolbar icon, inactive state - grayscale version)
- `icon-off48.png` - 48x48px (toolbar icon, inactive state - grayscale version)

## Converting SVG to PNG

### Using ImageMagick (command line):

```bash
# Active icons
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png

# Inactive icons (grayscale)
convert -background none icon.svg -resize 16x16 -colorspace Gray icon-off16.png
convert -background none icon.svg -resize 48x48 -colorspace Gray icon-off48.png
```

### Using Inkscape (command line):

```bash
inkscape icon.svg --export-filename=icon16.png --export-width=16 --export-height=16
inkscape icon.svg --export-filename=icon48.png --export-width=48 --export-height=48
inkscape icon.svg --export-filename=icon128.png --export-width=128 --export-height=128
```

### Using Online Tools:

1. Visit https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Convert to PNG at each required size
4. For inactive icons, use a tool like https://www.imgonline.com.ua/eng/convert-image-to-grayscale.php

## Alternative

If you don't have image conversion tools, temporarily use the SVG file or create simple colored rectangles as placeholders until proper icons are created.
