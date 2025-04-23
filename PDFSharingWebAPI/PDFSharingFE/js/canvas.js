document.addEventListener('DOMContentLoaded', function () {
    // 获取Canvas元素和上下文
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');

    // 鼠标位置跟踪
    const mouse = {
        x: null,
        y: null,
        radius: 100 // 鼠标影响范围半径
    };

    // 设置Canvas尺寸为窗口大小
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // 粒子类
    class Particle {
        constructor() {
            // 随机初始位置（全屏随机分布）
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;

            // 设置基准位置（用于弹性回归）
            this.baseX = this.x;
            this.baseY = this.y;

            // 弹性系数
            this.density = Math.random() * 10 + 10; //10-20

            // 随机大小（3-6像素）
            this.size = Math.random() * 4 + 2; //2px-6px

            // 随机运动速度（-1到1像素/帧）
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;


            // 随机颜色（银灰色浮动）
            this.color = `rgba(192, 192, 192, ${Math.random() * 0.6 + 0.2})`;
            this.baseColor = this.color; // 存储原始颜色

            // 光晕半径
            this.lightRadius = this.size * 1;
        }

        // 更新粒子位置
        update() {
            // 计算与鼠标的距离
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 鼠标交互效果
            if (distance < mouse.radius && mouse.x && mouse.y) {
                // 粒子被鼠标推开
                const force = (mouse.radius - distance) / mouse.radius;
                const angle = Math.atan2(dy, dx);
                const pushForce = force * this.density * 0.1; // 减小推力系数

                this.x -= Math.cos(angle) * pushForce;
                this.y -= Math.sin(angle) * pushForce;

            }

            // 常规移动
            this.x += this.speedX;
            this.y += this.speedY;

            // 边界检查
            if (this.x < 0 || this.x > canvas.width) {
                this.speedX = -this.speedX;
            }

            if (this.y < 0 || this.y > canvas.height) {
                this.speedY = -this.speedY;
            }
        }

        // 绘制粒子
        draw() {
            // 绘制光晕效果
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.lightRadius
            );
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, 'rgba(192, 192, 192, 0)');

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.lightRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // 绘制粒子核心
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    // 创建粒子数组
    const particles = [];
    function initParticles() {
        const particleCount = Math.floor((canvas.width * canvas.height) / 20000);

        // 清空并重新生成粒子
        particles.length = 0;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    // 连接相近的粒子
    function connectParticles() {
        ctx.lineWidth = 1;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];

                // 计算距离
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 如果距离小于150px则绘制连线
                if (distance < 150) {
                    const opacity = 1 - distance / 150;
                    ctx.strokeStyle = `hsla(200, 80%, 70%, ${opacity * 0.4})`;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }



    // 动画循环
    function animate() {

        // 用半透明矩形创建拖尾效果
        //颜色与默认背景#f0f2f5相同，用形状遮盖的方式实现拖尾，透明度越低拖尾越显著
        ctx.fillStyle = 'rgba(240, 242, 245, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 先绘制连线
        connectParticles();

        // 再绘制粒子
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        requestAnimationFrame(animate);
    }

    // 初始化
    resizeCanvas();
    initParticles();
    animate();

    // 鼠标移动事件
    window.addEventListener('mousemove', function (event) {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    // 鼠标离开窗口时
    window.addEventListener('mouseout', function () {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    // 触摸支持（移动设备）
    window.addEventListener('touchmove', function (event) {
        mouse.x = event.touches[0].clientX;
        mouse.y = event.touches[0].clientY;
    });

    // 窗口大小改变时重置
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });

});