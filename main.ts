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

    const MotorDirectionPins=[DigitalPin.P13, DigitalPin.P15]
        
    const MotorPWMPins=[AnalogPin.P14, AnalogPin.P16]
   
   

    export enum DHT11Type {
        //% block=temperature(°C)
        TemperatureC = 0,
        //% block=temperature(°F)
        TemperatureF = 1,
        //% block=humidity
        Humidity = 2
    }




    //% blockID=hhaha block="Raindrop|port %hee"
    //% weight=40
    //% group="Environment" blockGap=50
    export function RainDrop(hee: Ports): boolean{
        return true
    }

    //% blockId=dht11 block="DHT11|port %port|type %readtype"
    //% weight=60
    //% group="Environment" blockGap=50
    export function DHT11(port: Ports, readtype: DHT11Type): number {
        let dht11pin = PortDigi[port][0]

        return 1

    }

    export function MotorRun(index: Motors, speed: number): void {
        let motor_pwm_pin=MotorPWMPins[index]
        let motor_direction_pin=MotorDirectionPins[index]

        if(speed<0){
            pins.digitalWritePin(motor_direction_pin, 0)
        }else{
            pins.digitalWritePin(motor_direction_pin, 1)
        }
        pins.analogWritePin(motor_pwm_pin,speed/255*1024)
    
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
