console.log('%cYukikaze Blog', 'color:#747bff;font-size:16px');

// 项目卡片按压反馈（与主页交互风格一致）
document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('mousedown', function () {
        card.style.transform = 'scale(0.98)';
    });
    card.addEventListener('mouseup', function () {
        card.style.transform = '';
    });
    card.addEventListener('mouseleave', function () {
        card.style.transform = '';
    });
});
