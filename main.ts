let strip = enjoyneer.create(DigitalPin.P0, 3, NeoPixelMode.RGB)
strip.setThreePixelColor(enjoyneer.colors(NeoPixelColors.Red), enjoyneer.colors(NeoPixelColors.Yellow), enjoyneer.colors(NeoPixelColors.Green))
strip.show()
