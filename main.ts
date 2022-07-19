enum NeoPixelColors {
    //% block=red
    Red = 0xFF0000,
    //% block=orange
    Orange = 0xFFA500,
    //% block=yellow
    Yellow = 0xFFFF00,
    //% block=green
    Green = 0x00FF00,
    //% block=blue
    Blue = 0x0000FF,
    //% block=indigo
    Indigo = 0x4b0082,
    //% block=violet
    Violet = 0x8a2be2,
    //% block=purple
    Purple = 0xFF00FF,
    //% block=white
    White = 0xFFFFFF,
    //% block=black
    Black = 0x000000
}
enum NeoPixelMode {
    //% block="RGB (GRB format)"
    RGB = 1,
    //% block="RGB+W"
    RGBW = 2,
    //% block="RGB (RGB format)"
    RGB_RGB = 3
}
namespace enjoyneer {

    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04
    const PRESCALE = 0xFE
    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09
    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD


    let initialized = false

    const PortDigi = [
        [DigitalPin.P0, DigitalPin.P8],
        [DigitalPin.P1, DigitalPin.P12],
    ]

    const PortAnalog = [
        AnalogPin.P0,
        AnalogPin.P1
    ]

    export enum Ports {
        PORT1 = 0,
        PORT2 = 1,
    }

    export enum Slots {
        A = 1, // inverse slot by zp
        B = 0
    }

    export enum Motors {
        Motor1 = 0,
        Motor2 = 1
    }

    const MotorPins = [
        [AnalogPin.P13, AnalogPin.P14],
        [AnalogPin.P15, AnalogPin.P16]
    ]

    export enum TempType {
        //% block="Celsius (*C)"
        celsius,
        //% block="Fahrenheit (*F)"
        fahrenheit,
    }

    let time_passed = 0
    let dataArray: boolean[] = []
    let resultArray: number[] = []

    function queryData(dataPin: DigitalPin): number[] {
        //initialize
        dataArray = []
        resultArray = []
        for (let index = 0; index < 40; index++) dataArray.push(false)
        for (let index2 = 0; index2 < 5; index2++) resultArray.push(0)
        if (input.runningTime() - time_passed > 5000 || time_passed == 0) {
            //request data
            pins.digitalWritePin(dataPin, 0) //begin protocol, pull down pin
            basic.pause(18)

            pins.digitalReadPin(dataPin) //pull up pin
            control.waitMicros(40)

            while (pins.digitalReadPin(dataPin) == 0); //sensor response
            while (pins.digitalReadPin(dataPin) == 1);
            //read data (5 bytes)
            for (let index3 = 0; index3 < 40; index3++) {
                while (pins.digitalReadPin(dataPin) == 1);
                while (pins.digitalReadPin(dataPin) == 0);
                control.waitMicros(28)
                //if sensor still pull up data pin after 28 us it means 1, otherwise 0
                if (pins.digitalReadPin(dataPin) == 1) dataArray[index3] = true
            }

            //convert byte number array to integer
            for (let index4 = 0; index4 < 5; index4++)
                for (let index22 = 0; index22 < 8; index22++)
                    if (dataArray[8 * index4 + index22]) resultArray[index4] += 2 ** (7 - index22)
            time_passed = input.runningTime()
        }
        return [resultArray[2] + resultArray[3] / 10, resultArray[0] + resultArray[1] / 10]
    }

    //% block="DHT11 Temperature |pin $dataPin| unit $tempType"
    export function Temperature(dataPin: DigitalPin, tempType: TempType) {
        return tempType == TempType.celsius ? queryData(dataPin)[0] : queryData(dataPin)[0] * 9 / 5 + 32
    }

    //% block="DHT11 Humidity |pin $dataPin"
    export function Humidity(dataPin: DigitalPin) {
        return queryData(dataPin)[1]
    }

    //% blockID=hhaha block="Raindrop|port %hee"
    export function RainDrop(hee: Ports): boolean {
        return pins.digitalReadPin(PortDigi[hee][0]) == 1
    }

    //% blockID=hhahae block="Raindrop|port %hee"
    export function RainDropVal(hee: Ports): number {
        return pins.analogReadPin(PortAnalog[hee])
    }

    //% blockID=hhehe block="Motor|port %hee|speed %haa"
    //% haa.min=-100 haa.max=100
    export function MotorRun(hee: Motors, haa: number): void {
        pins.analogWritePin(MotorPins[hee][0], haa > 0 ? haa / 100 * 1023 : 0)
        pins.analogWritePin(MotorPins[hee][1], haa < 0 ? -haa / 100 * 1023 : 0)
    }

    //% blockId=custom_motor_dual block="Motor|speed of Motor1 %speed1|speed of Motor2 %speed2"
    //% weight=43
    //% speed1.min=-100 speed1.max=100
    //% speed2.min=-100 speed2.max=100
    //% group="Actuator" name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function MotorRunDual(speed1: number, speed2: number): void {
        MotorRun(0, speed1);
        MotorRun(1, speed2);
    }

    //% blockId=custom_tracer block="Tracer|port %port|slot %slot"
    //% group="Linefollower" weight=81
    export function Tracer(port: Ports, slot: Slots): boolean {
        let pin = PortDigi[port][slot]
        pins.setPull(pin, PinPullMode.PullUp)
        return pins.digitalReadPin(pin) == 1
    }

    //% blockId=custom_tracing_line_with_motors block="MoveAlongBlackLine|port %port|speed %speed"
    //% speed.min=-255 speed.max=255
    export function TracingLineWithMotors(port: Ports, speed: number): void {
        if (Tracer(port, Slots.A) && Tracer(port, Slots.B)) {
            MotorRunDual(speed, speed)
        } else if (!(Tracer(port, Slots.A)) && Tracer(port, Slots.B)) {
            MotorRunDual(speed, -speed)
        } else if (Tracer(port, Slots.A) && !(Tracer(port, Slots.B))) {
            MotorRunDual(-speed, speed)
        } else if (!(Tracer(port, Slots.A)) && !(Tracer(port, Slots.B))) {
            MotorRunDual(-speed, -speed)
        }
    }

    export class Strip {
        buf: Buffer;
        pin: DigitalPin;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        _length: number; // number of LEDs
        _mode: NeoPixelMode;
        _matrixWidth: number; // number of leds in a matrix - if any

        /**
         * Shows all LEDs to a given color (range 0-255 for r, g, b).
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_strip_color" block="%strip|show color %rgb=neopixel_colors"
        //% strip.defl=strip
        //% weight=85 blockGap=8
        //% parts="neopixel"
        showColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        /**
         * Shows a rainbow pattern on all LEDs.
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        //% blockId="neopixel_set_strip_rainbow" block="%strip|show rainbow from %startHue|to %endHue"
        //% strip.defl=strip
        //% weight=85 blockGap=8
        //% parts="neopixel"
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, hsl(h, s, l));
                }
                this.setPixelColor(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

        /**
         * Displays a vertical bar graph based on the `value` and `high` value.
         * If `high` is 0, the chart gets adjusted automatically.
         * @param value current value to plot
         * @param high maximum value, eg: 255
         */
        //% weight=84
        showBarGraph(value: number, high: number): void {
            if (high <= 0) {
                this.clear();
                this.setPixelColor(0, NeoPixelColors.Yellow);
                this.show();
                return;
            }

            value = Math.abs(value);
            const n = this._length;
            const n1 = n - 1;
            let v = Math.idiv((value * n), high);
            if (v == 0) {
                this.setPixelColor(0, 0x666600);
                for (let j = 1; j < n; ++j)
                    this.setPixelColor(j, 0);
            } else {
                for (let k = 0; k < n; ++k) {
                    if (k <= v) {
                        const b = Math.idiv(k * 255, n1);
                        this.setPixelColor(k, enjoyneer.rgb(b, 0, 255 - b));
                    }
                    else this.setPixelColor(k, 0);
                }
            }
            this.show();
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b).
         * You need to call ``show`` to make the changes visible.
         * @param pixeloffset position of the NeoPixel in the strip
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_pixel_color" block="%strip|set pixel color at %pixeloffset|to %rgb=neopixel_colors"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=80
        //% parts="neopixel" advanced=true
        setPixelColor(pixeloffset: number, rgb: number): void {
            this.setPixelRGB(pixeloffset >> 0, rgb >> 0);
        }

        //% blockId="neopixel_set_3_pixel_color" block="%strip|set pixel color at 1 to %rgb1=neopixel_colors|at 2 to %rgb2=neopixel_colors|at 3 to %rgb3=neopixel_colors"
        //% strip.defl=strip
        //% parts="neopixel" 
        setThreePixelColor(rgb1: number, rgb2: number, rgb3: number): void {
            if (this._length != 3) return
            this.setPixelColor(0, rgb1)
            this.setPixelColor(1, rgb2)
            this.setPixelColor(2, rgb3)

        }

        /**
         * Sets the number of pixels in a matrix shaped strip
         * @param width number of pixels in a row
         */
        //% blockId=neopixel_set_matrix_width block="%strip|set matrix width %width"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=5
        //% parts="neopixel" advanced=true
        setMatrixWidth(width: number) {
            this._matrixWidth = Math.min(this._length, width >> 0);
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b) in a matrix shaped strip
         * You need to call ``show`` to make the changes visible.
         * @param x horizontal position
         * @param y horizontal position
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_matrix_color" block="%strip|set matrix color at x %x|y %y|to %rgb=neopixel_colors"
        //% strip.defl=strip
        //% weight=4
        //% parts="neopixel" advanced=true
        setMatrixColor(x: number, y: number, rgb: number) {
            if (this._matrixWidth <= 0) return; // not a matrix, ignore
            x = x >> 0;
            y = y >> 0;
            rgb = rgb >> 0;
            const cols = Math.idiv(this._length, this._matrixWidth);
            if (x < 0 || x >= this._matrixWidth || y < 0 || y >= cols) return;
            let m = x + y * this._matrixWidth;
            this.setPixelColor(m, rgb);
        }

        /**
         * For NeoPixels with RGB+W LEDs, set the white LED brightness. This only works for RGB+W NeoPixels.
         * @param pixeloffset position of the LED in the strip
         * @param white brightness of the white LED
         */
        //% blockId="neopixel_set_pixel_white" block="%strip|set pixel white LED at %pixeloffset|to %white"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=80
        //% parts="neopixel" advanced=true
        setPixelWhiteLED(pixeloffset: number, white: number): void {
            if (this._mode === NeoPixelMode.RGBW) {
                this.setPixelW(pixeloffset >> 0, white >> 0);
            }
        }

        /**
         * Send all the changes to the strip.
         */
        //% blockId="neopixel_show" block="%strip|show" blockGap=8
        //% strip.defl=strip
        //% weight=79
        //% parts="neopixel"
        show() {
            // only supported in beta
            // ws2812b.setBufferMode(this.pin, this._mode);
            ws2812b.sendBuffer(this.buf, this.pin);
        }

        /**
         * Turn off all LEDs.
         * You need to call ``show`` to make the changes visible.
         */
        //% blockId="neopixel_clear" block="%strip|clear"
        //% strip.defl=strip
        //% weight=76
        //% parts="neopixel"
        clear(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.fill(0, this.start * stride, this._length * stride);
        }

        /**
         * Gets the number of pixels declared on the strip
         */
        //% blockId="neopixel_length" block="%strip|length" blockGap=8
        //% strip.defl=strip
        //% weight=60 advanced=true
        length() {
            return this._length;
        }

        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% blockId="neopixel_set_brightness" block="%strip|set brightness %brightness" blockGap=8
        //% strip.defl=strip
        //% weight=59
        //% parts="neopixel" advanced=true
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0xff;
        }

        /**
         * Apply brightness to current colors using a quadratic easing function.
         **/
        //% blockId="neopixel_each_brightness" block="%strip|ease brightness" blockGap=8
        //% strip.defl=strip
        //% weight=58
        //% parts="neopixel" advanced=true
        easeBrightness(): void {
            const stride2 = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const br = this.brightness;
            const buf = this.buf;
            const end = this.start + this._length;
            const mid = Math.idiv(this._length, 2);
            for (let o = this.start; o < end; ++o) {
                const p = o - this.start;
                const ledoffset = o * stride2;
                const br2 = p > mid
                    ? Math.idiv(255 * (this._length - 1 - p) * (this._length - 1 - p), (mid * mid))
                    : Math.idiv(255 * p * p, (mid * mid));
                const r = (buf[ledoffset + 0] * br2) >> 8; buf[ledoffset + 0] = r;
                const g = (buf[ledoffset + 1] * br2) >> 8; buf[ledoffset + 1] = g;
                const c = (buf[ledoffset + 2] * br2) >> 8; buf[ledoffset + 2] = c;
                if (stride2 == 4) {
                    const w = (buf[ledoffset + 3] * br2) >> 8; buf[ledoffset + 3] = w;
                }
            }
        }

        /**
         * Create a range of LEDs.
         * @param start offset in the LED strip to start the range
         * @param length number of LEDs in the range. eg: 4
         */
        //% weight=89
        range(start: number, length: number): Strip {
            start = start >> 0;
            length = length >> 0;
            let strip = new Strip();
            strip.buf = this.buf;
            strip.pin = this.pin;
            strip.brightness = this.brightness;
            strip.start = this.start + Math.clamp(0, this._length - 1, start);
            strip._length = Math.clamp(0, this._length - (strip.start - this.start), length);
            strip._matrixWidth = 0;
            strip._mode = this._mode;
            return strip;
        }

        /**
         * Shift LEDs forward and clear with zeros.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to shift forward, eg: 1
        
        shift(offset: number = 1): void {
            offset = offset >> 0;
            const stride3 = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.shift(-offset * stride3, this.start * stride3, this._length * stride3)
        }

        /**
         * Rotate LEDs forward.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to rotate forward, eg: 1
         */
        rotate(offset: number = 1): void {
            offset = offset >> 0;
            const stride4 = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.rotate(-offset * stride4, this.start * stride4, this._length * stride4)
        }

        /**
         * Set the pin where the neopixel is connected, defaults to P0.
         */
        //% weight=10
        //% parts="neopixel" advanced=true
        setPin(pin: DigitalPin): void {
            this.pin = pin;
            pins.digitalWritePin(this.pin, 0);
            // don't yield to avoid races on initialization
        }

        /**
         * Estimates the electrical current (mA) consumed by the current light configuration.
         */
        //% weight=9 blockId=neopixel_power block="%strip|power (mA)"
        //% strip.defl=strip
        //% advanced=true
        power(): number {
            const stride5 = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const end2 = this.start + this._length;
            let q = 0;
            for (let t = this.start; t < end2; ++t) {
                const ledoffset2 = t * stride5;
                for (let u = 0; u < stride5; ++u) {
                    q += this.buf[t + u];
                }
            }
            return Math.idiv(this.length() * 7, 10) /* 0.7mA per neopixel */
                + Math.idiv(q * 480, 10000); /* rought approximation */
        }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            if (this._mode === NeoPixelMode.RGB_RGB) {
                this.buf[offset + 0] = red;
                this.buf[offset + 1] = green;
            } else {
                this.buf[offset + 0] = green;
                this.buf[offset + 1] = red;
            }
            this.buf[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br3 = this.brightness;
            if (br3 < 255) {
                red = (red * br3) >> 8;
                green = (green * br3) >> 8;
                blue = (blue * br3) >> 8;
            }
            const end3 = this.start + this._length;
            const stride6 = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            for (let a = this.start; a < end3; ++a) {
                this.setBufferRGB(a * stride6, red, green, blue)
            }
        }
        private setAllW(white: number) {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            let br4 = this.brightness;
            if (br4 < 255) {
                white = (white * br4) >> 8;
            }
            let buf2 = this.buf;
            let end4 = this.start + this._length;
            for (let d = this.start; d < end4; ++d) {
                let ledoffset3 = d * 4;
                buf2[ledoffset3 + 3] = white;
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            let stride7 = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            pixeloffset = (pixeloffset + this.start) * stride7;

            let red2 = unpackR(rgb);
            let green2 = unpackG(rgb);
            let blue2 = unpackB(rgb);

            let br5 = this.brightness;
            if (br5 < 255) {
                red2 = (red2 * br5) >> 8;
                green2 = (green2 * br5) >> 8;
                blue2 = (blue2 * br5) >> 8;
            }
            this.setBufferRGB(pixeloffset, red2, green2, blue2)
        }
        private setPixelW(pixeloffset: number, white: number): void {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 4;

            let br6 = this.brightness;
            if (br6 < 255) {
                white = (white * br6) >> 8;
            }
            let buf3 = this.buf;
            buf3[pixeloffset + 3] = white;
        }
    }

    /**
     * Create a new NeoPixel driver for `numleds` LEDs.
     * @param pin the pin where the neopixel is connected.
     * @param numleds number of leds in the strip, eg: 24,30,60,64
     */
    //% blockId="neopixel_create" block="NeoPixel at pin %pin|with %numleds|leds as %mode"
    //% weight=90 blockGap=8
    //% parts="neopixel"
    //% trackArgs=0,2
    //% blockSetVariable=strip
    export function create(pin: DigitalPin, numleds: number, mode: NeoPixelMode): Strip {
        let strip2 = new Strip();
        let stride8 = mode === NeoPixelMode.RGBW ? 4 : 3;
        strip2.buf = pins.createBuffer(numleds * stride8);
        strip2.start = 0;
        strip2._length = numleds;
        strip2._mode = mode || NeoPixelMode.RGB;
        strip2._matrixWidth = 0;
        strip2.setBrightness(128)
        strip2.setPin(pin)
        return strip2;
    }

    /**
     * Converts red, green, blue channels into a RGB color
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    //% weight=1
    //% blockId="neopixel_rgb" block="red %red|green %green|blue %blue"
    //% advanced=true
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% weight=2 blockGap=8
    //% blockId="neopixel_colors" block="%color"
    //% advanced=true
    export function colors(color: NeoPixelColors): number {
        return color;
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let e = (rgb >> 16) & 0xFF;
        return e;
    }
    function unpackG(rgb: number): number {
        let f = (rgb >> 8) & 0xFF;
        return f;
    }
    function unpackB(rgb: number): number {
        let b2 = (rgb) & 0xFF;
        return b2;
    }

    /**
     * Converts a hue saturation luminosity value into a RGB color
     * @param h hue from 0 to 360
     * @param s saturation from 0 to 99
     * @param l luminosity from 0 to 99
     */
    function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c2 = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h12 = Math.idiv(h, 60);//[0,6]
        let h22 = Math.idiv((h - h12 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h12 % 2) << 8) + h22) - 256);
        let x = (c2 * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h12 == 0) {
            r$ = c2; g$ = x; b$ = 0;
        } else if (h12 == 1) {
            r$ = x; g$ = c2; b$ = 0;
        } else if (h12 == 2) {
            r$ = 0; g$ = c2; b$ = x;
        } else if (h12 == 3) {
            r$ = 0; g$ = x; b$ = c2;
        } else if (h12 == 4) {
            r$ = x; g$ = 0; b$ = c2;
        } else if (h12 == 5) {
            r$ = c2; g$ = 0; b$ = x;
        }
        let m2 = Math.idiv((Math.idiv((l * 2 << 8), 100) - c2), 2);
        let r2 = r$ + m2;
        let g2 = g$ + m2;
        let b3 = b$ + m2;
        return packRGB(r2, g2, b3);
    }

    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }
}
