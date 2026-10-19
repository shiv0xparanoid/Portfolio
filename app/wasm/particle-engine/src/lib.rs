use wasm_bindgen::prelude::*;

struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    r: u8,
    g: u8,
    b: u8,
    a: u8,
}

struct XorShiftRng {
    state: u64,
}

impl XorShiftRng {
    fn seed(seed: u64) -> Self {
        XorShiftRng {
            state: if seed == 0 { 0xdeadbeefcafebabe } else { seed },
        }
    }

    fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x as u32
    }

    fn next_f32(&mut self) -> f32 {
        self.next_u32() as f32 / (u32::MAX as f32)
    }

    fn gen_range_f32(&mut self, low: f32, high: f32) -> f32 {
        low + self.next_f32() * (high - low)
    }
}

fn perlin_mix(a: f64, b: f64, t: f64) -> f64 {
    a + t * (b - a)
}

fn fade(t: f64) -> f64 {
    t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
}

fn grad(hash: u32, x: f64, y: f64, z: f64) -> f64 {
    let h = hash & 15;
    let u = if h < 8 { x } else { y };
    let v = if h < 4 {
        y
    } else if h == 12 || h == 14 {
        x
    } else {
        z
    };
    let a = if (h & 1) == 0 { u } else { -u };
    let b = if (h & 2) == 0 { v } else { -v };
    a + b
}

static PERM: [u8; 512] = [
    151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
    8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
    35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
    134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
    55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
    18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
    250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
    189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
    172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
    228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
    107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
    151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
    8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
    35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
    134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
    55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
    18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
    250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
    189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
    172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
    228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
    107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
];

fn noise3(x: f64, y: f64, z: f64) -> f64 {
    let xi = (x.floor() as i32) & 255;
    let yi = (y.floor() as i32) & 255;
    let zi = (z.floor() as i32) & 255;
    let xf = x - x.floor();
    let yf = y - y.floor();
    let zf = z - z.floor();
    let u = fade(xf);
    let v = fade(yf);
    let w = fade(zf);

    let aaa = PERM[(PERM[(PERM[xi as usize] as usize + yi as usize) & 511] as usize + zi as usize) & 511] as u32;
    let aba = PERM[(PERM[(PERM[xi as usize] as usize + (yi + 1) as usize) & 511] as usize + zi as usize) & 511] as u32;
    let aab = PERM[(PERM[(PERM[xi as usize] as usize + yi as usize) & 511] as usize + (zi + 1) as usize) & 511] as u32;
    let abb = PERM[(PERM[(PERM[xi as usize] as usize + (yi + 1) as usize) & 511] as usize + (zi + 1) as usize) & 511] as u32;
    let baa = PERM[(PERM[(PERM[(xi + 1) as usize] as usize + yi as usize) & 511] as usize + zi as usize) & 511] as u32;
    let bba = PERM[(PERM[(PERM[(xi + 1) as usize] as usize + (yi + 1) as usize) & 511] as usize + zi as usize) & 511] as u32;
    let bab = PERM[(PERM[(PERM[(xi + 1) as usize] as usize + yi as usize) & 511] as usize + (zi + 1) as usize) & 511] as u32;
    let bbb = PERM[(PERM[(PERM[(xi + 1) as usize] as usize + (yi + 1) as usize) & 511] as usize + (zi + 1) as usize) & 511] as u32;

    let x1 = perlin_mix(grad(aaa, xf, yf, zf), grad(baa, xf - 1.0, yf, zf), u);
    let x2 = perlin_mix(grad(aba, xf, yf - 1.0, zf), grad(bba, xf - 1.0, yf - 1.0, zf), u);
    let y1 = perlin_mix(x1, x2, v);
    let x3 = perlin_mix(grad(aab, xf, yf, zf - 1.0), grad(bab, xf - 1.0, yf, zf - 1.0), u);
    let x4 = perlin_mix(grad(abb, xf, yf - 1.0, zf - 1.0), grad(bbb, xf - 1.0, yf - 1.0, zf - 1.0), u);
    let y2 = perlin_mix(x3, x4, v);

    perlin_mix(y1, y2, w)
}

#[wasm_bindgen]
pub struct ParticleEngine {
    particles: Vec<Particle>,
    positions: Vec<f32>,
    colors: Vec<u8>,
    width: f32,
    height: f32,
    rng: XorShiftRng,
    elapsed: f32,
}

#[wasm_bindgen]
impl ParticleEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ParticleEngine {
        ParticleEngine {
            particles: Vec::new(),
            positions: Vec::new(),
            colors: Vec::new(),
            width: 0.0,
            height: 0.0,
            rng: XorShiftRng::seed(0x123456789abcdef0),
            elapsed: 0.0,
        }
    }

    pub fn init(&mut self, count: u32, width: f32, height: f32) {
        self.width = width;
        self.height = height;
        self.particles.clear();
        self.positions.resize((count * 2) as usize, 0.0);
        self.colors.resize((count * 4) as usize, 0);

        for _ in 0..count {
            let x = self.rng.gen_range_f32(0.0, width);
            let y = self.rng.gen_range_f32(0.0, height);
            let hue = self.rng.gen_range_f32(0.0, 360.0);
            let (r, g, b) = hsl_to_rgb(hue, 70.0, 60.0);
            self.particles.push(Particle {
                x,
                y,
                vx: 0.0,
                vy: 0.0,
                r,
                g,
                b,
                a: 200,
            });
        }
        self.sync_buffers();
    }

    pub fn update(&mut self, delta_ms: f32) {
        let dt = delta_ms * 0.001;
        let scale = 0.003;
        self.elapsed += dt;
        let time = self.elapsed as f64;

        for p in self.particles.iter_mut() {
            let nx = (p.x * scale) as f64;
            let ny = (p.y * scale) as f64;

            let angle = noise3(nx, ny, time) * std::f64::consts::PI * 2.0;
            let speed = 80.0;

            p.vx += (angle.cos() as f32) * speed * dt;
            p.vy += (angle.sin() as f32) * speed * dt;

            p.vx *= 0.95;
            p.vy *= 0.95;

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if p.x < 0.0 { p.x += self.width; }
            if p.x > self.width { p.x -= self.width; }
            if p.y < 0.0 { p.y += self.height; }
            if p.y > self.height { p.y -= self.height; }
        }
        self.sync_buffers();
    }

    pub fn attract_to(&mut self, x: f32, y: f32, strength: f32) {
        for p in self.particles.iter_mut() {
            let dx = x - p.x;
            let dy = y - p.y;
            let dist_sq = dx * dx + dy * dy;
            let dist = dist_sq.sqrt() + 0.001;
            let force = strength / dist_sq.max(100.0);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
        }
    }

    pub fn get_positions(&self) -> *const f32 {
        self.positions.as_ptr()
    }

    pub fn get_colors(&self) -> *const u8 {
        self.colors.as_ptr()
    }

    pub fn count(&self) -> u32 {
        self.particles.len() as u32
    }
}

impl ParticleEngine {
    fn sync_buffers(&mut self) {
        for (i, p) in self.particles.iter().enumerate() {
            self.positions[i * 2] = p.x;
            self.positions[i * 2 + 1] = p.y;
            self.colors[i * 4] = p.r;
            self.colors[i * 4 + 1] = p.g;
            self.colors[i * 4 + 2] = p.b;
            self.colors[i * 4 + 3] = p.a;
        }
    }
}

fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8, u8, u8) {
    let s = s / 100.0;
    let l = l / 100.0;
    let k = |n: f32| (n + h / 30.0) % 12.0;
    let a = s * l.min(1.0 - l);
    let f = |n: f32| l - a * (k(n)).clamp(-1.0, 1.0).min(3.0 - k(n)).max(-1.0);
    let r = (f(0.0) * 255.0) as u8;
    let g = (f(8.0) * 255.0) as u8;
    let b = (f(4.0) * 255.0) as u8;
    (r, g, b)
}

#[wasm_bindgen]
pub fn perlin2(x: f64, y: f64, t: f64) -> f64 {
    noise3(x, y, t) * 0.5 + 0.5
}

#[wasm_bindgen]
pub fn fbm(x: f64, y: f64, octaves: u32) -> f64 {
    let mut total = 0.0;
    let mut amplitude = 1.0;
    let mut frequency = 1.0;
    let mut max_value = 0.0;

    for _ in 0..octaves {
        total += noise3(x * frequency, y * frequency, 0.0) * amplitude;
        max_value += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    total / max_value * 0.5 + 0.5
}
