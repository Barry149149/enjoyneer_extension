// 在這裡測試；當此封包作為擴充功能時，將不會編譯此內容。
//% block="Enjoyneer" weight=100 color=#650ba1 icon="\uf188"
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

    export enum Ports {
        PORT1 = 0,
        PORT2 = 1,
    }

    export enum Slots {
        A = 1, // inverse slot by zp
        B = 0
    }

    export enum Motors {
        Motor1 = 13,
        Motor2 = 15
    }

    const MotorDirectionPins = [DigitalPin.P13, DigitalPin.P15]

    const MotorPWMPins = [AnalogPin.P14, AnalogPin.P16]

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
        if (input.runningTime() - time_passed > 5000 || time_passed == 0) {
            dataArray = []
            resultArray = []
            for (let index = 0; index < 40; index++) dataArray.push(false)
            for (let index = 0; index < 5; index++) resultArray.push(0)

            //request data
            pins.digitalWritePin(dataPin, 0) //begin protocol, pull down pin
            basic.pause(18)

            pins.digitalReadPin(dataPin) //pull up pin
            control.waitMicros(40)

            while (pins.digitalReadPin(dataPin) == 0); //sensor response
            while (pins.digitalReadPin(dataPin) == 1);
            //read data (5 bytes)
            for (let index = 0; index < 40; index++) {
                while (pins.digitalReadPin(dataPin) == 1);
                while (pins.digitalReadPin(dataPin) == 0);
                control.waitMicros(28)
                //if sensor still pull up data pin after 28 us it means 1, otherwise 0
                if (pins.digitalReadPin(dataPin) == 1) dataArray[index] = true
            }

            //convert byte number array to integer
            for (let index = 0; index < 5; index++)
                for (let index2 = 0; index2 < 8; index2++)
                    if (dataArray[8 * index + index2]) resultArray[index] += 2 ** (7 - index2)
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
    //% weight=40
    //% group="Environment" blockGap=50
    export function RainDrop(hee: Ports): boolean {
        return true
    }

    export function MotorRun(index: Motors, speed: number): void {
        let motor_pwm_pin = MotorPWMPins[index]
        let motor_direction_pin = MotorDirectionPins[index]

        if (speed < 0) {
            pins.digitalWritePin(motor_direction_pin, 0)
        } else {
            pins.digitalWritePin(motor_direction_pin, 1)
        }
        pins.analogWritePin(motor_pwm_pin, speed / 255 * 1024)

    }

    //% blockId=custom_motor_dual block="Motor|speed of Motor1 %speed1|speed of Motor2 %speed2"
    //% weight=43
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
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
}
