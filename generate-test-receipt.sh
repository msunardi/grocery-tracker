#!/bin/bash
# Generate a test grocery receipt image using ImageMagick
# Output: test_receipt.jpg in the current directory
# Requires: ImageMagick (convert command)

convert -size 460x720 xc:white \
  -font DejaVu-Sans-Bold -pointsize 22 -fill black \
  -gravity North -annotate +0+20 "WHOLE FOODS MARKET" \
  -font DejaVu-Sans -pointsize 13 \
  -gravity North -annotate +0+52 "123 Main St, Austin TX 78701" \
  -annotate +0+70 "Tel: (512) 555-0123" \
  -annotate +0+90 "Date: 03/19/2026   Time: 10:34 AM" \
  -annotate +0+108 "Cashier: Sarah   Register: 03" \
  -draw "line 10,128 450,128" \
  -font DejaVu-Sans-Bold -pointsize 13 \
  -gravity NorthWest -annotate +10+138 "ITEM                      QTY    PRICE" \
  -draw "line 10,158 450,158" \
  -font DejaVu-Sans -pointsize 13 \
  -annotate +10+165 "Organic Bananas              1 lb    \$0.79" \
  -annotate +10+183 "Baby Spinach 5oz               1      \$4.99" \
  -annotate +10+201 "Whole Milk 1gal                1      \$5.49" \
  -annotate +10+219 "Cheddar Cheese 8oz             2      \$7.98" \
  -annotate +10+237 "Sourdough Bread                1      \$4.49" \
  -annotate +10+255 "Chicken Breast 2lb             1     \$11.98" \
  -annotate +10+273 "Orange Juice 52oz              1      \$5.29" \
  -annotate +10+291 "Sparkling Water 12pk           1      \$8.99" \
  -annotate +10+309 "Granola Bars 6ct               1      \$3.79" \
  -annotate +10+327 "Dish Soap 16oz                 1      \$2.49" \
  -annotate +10+345 "Frozen Pizza                   1      \$6.99" \
  -annotate +10+363 "Diced Tomatoes 14oz            2      \$3.18" \
  -draw "line 10,383 450,383" \
  -font DejaVu-Sans -pointsize 14 \
  -annotate +10+393 "Subtotal:                          \$66.45" \
  -annotate +10+413 "Tax (8.25%):                        \$5.48" \
  -draw "line 10,435 450,435" \
  -font DejaVu-Sans-Bold -pointsize 20 \
  -annotate +10+445 "TOTAL:                             \$71.93" \
  -draw "line 10,475 450,475" \
  -font DejaVu-Sans -pointsize 13 \
  -annotate +10+485 "VISA ending 4521                   \$71.93" \
  -annotate +10+503 "Auth: 847362" \
  -gravity North -annotate +0+530 "Thank you for shopping!" \
  -annotate +0+550 "You saved \$12.40 today!" \
  test_receipt.jpg

echo "Generated test_receipt.jpg ($(du -h test_receipt.jpg | cut -f1))"
