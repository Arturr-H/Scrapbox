class Particle {
    constructor(x, y, color, global_gravity, particle_spread) {
        this.x = x;
        this.y = y;
        this.gravity = Math.random() * global_gravity + global_gravity/2;
        this.velocity = {
            x: 0,
            y: 0
        };
        
        this.angle = 0;
        this.rotation = 0;
        this.rotationSpeed = 0;

        this.spread = particle_spread;
        
        this.color = color;
        this.size = {
            x: 1,
            y: 1
        };
    }

    update() {
        this.angle += this.rotationSpeed;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y += this.gravity;
        this.velocity.x += Math.random() * this.spread - this.spread/2;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        ctx.restore();
    }
}

class ParticleSystem{
    constructor(config){
        this.particles_array = [];
        this.particle_amount = config.particle_amount;
        this.canvas = config.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.colors = config.colors;

        this.x = 0;
        this.y = 0;

        this.size = config.size;
        this.speed = config.speed;

        this.spread = config.spread;
        this.gravity = config.gravity;
        this.rotation_speed = config.rotation_speed;

        this.cluster_length = config.cluster_length;

    }
    create_particles(){

        for (let i = 0; i < this.particle_amount; i++) {
            const color = this.colors[Math.floor(Math.random() * this.colors.length)];

            const x = Math.random() * this.canvas.width;
            const y = -this.cluster_length - Math.random() * -this.cluster_length;

            const particle = new Particle(x, y, color, this.gravity, this.spread);
            const y_velocity = Math.random() * this.speed + this.speed;

            particle.size = {
                x: this.size.x,
                y: Math.random() * this.size.y + this.size.y,
            };
            particle.rotationSpeed = Math.random() * this.rotation_speed - this.rotation_speed / 2;
            particle.velocity.y = y_velocity + y_velocity;
            this.particles_array.push(particle);
        }
    }
    update(update_time_delta){
        this.particles_array.forEach(particle => {
            particle.draw(this.ctx);
            particle.update();
        });
    }

    draw(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.update(this.ctx);
        requestAnimationFrame(this.draw.bind(this));
    }

    render(){
        this.create_particles();
        this.draw();
    }
}
