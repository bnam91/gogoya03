// 로그인 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // TODO: 로그인 로직 구현
            console.log('Login attempt:', { email, password });
        });
    }
}); 