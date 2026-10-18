   
                                                                                                 
                                                                                                    
   
export class OneEuro {
    private x: number | null = null;
    private dx = 0;

    private readonly minCutoff: number;
    private readonly beta: number;
    private readonly dCutoff: number;

    constructor(minCutoff = 1.4, beta = 3, dCutoff = 1) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
    }

    private static alpha(cutoff: number, dt: number): number {
        const tau = 1 / (2 * Math.PI * cutoff);
        return 1 / (1 + tau / dt);
    }

    filter(value: number, dtSeconds: number): number {
        const dt = Math.max(dtSeconds, 0.001);
        if (this.x === null) {
            this.x = value;
            this.dx = 0;
            return value;
        }
        const rawSpeed = (value - this.x) / dt;
        this.dx += OneEuro.alpha(this.dCutoff, dt) * (rawSpeed - this.dx);
        const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
        this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
        return this.x;
    }

    reset(): void {
        this.x = null;
        this.dx = 0;
    }
}
