document.addEventListener('DOMContentLoaded', () => {
    if (APP.auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.auth-tabs .tab');
    let activeTab = 'login';

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            activeTab = tab.dataset.tab;
            tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));
            loginForm.classList.toggle('active', activeTab === 'login');
            registerForm.classList.toggle('active', activeTab === 'register');
            clearErrors();
        });
    });

    function clearErrors() {
        document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));
    }

    document.getElementById('btn-login').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username) {
            document.getElementById('login-username-error').textContent = '请输入用户名';
            return;
        }
        if (!password) {
            document.getElementById('login-password-error').textContent = '请输入密码';
            return;
        }

        const btn = document.getElementById('btn-login');
        btn.disabled = true;
        btn.textContent = '登录中...';

        try {
            const res = await APP.api.post('/user/login', { username, password });
            if (res && res.code === 200) {
                APP.auth.setToken(res.data.token);
                APP.auth.setUser(res.data.user);
                APP.toast('登录成功', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            }
        } catch (err) {
            document.getElementById('login-password-error').textContent = err.message;
        } finally {
            btn.disabled = false;
            btn.textContent = '登 录';
        }
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
        clearErrors();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const nickname = document.getElementById('reg-nickname').value.trim();

        let hasError = false;
        if (!username) {
            document.getElementById('reg-username-error').textContent = '请输入用户名';
            hasError = true;
        }
        if (!password) {
            document.getElementById('reg-password-error').textContent = '请输入密码';
            hasError = true;
        } else if (password.length < 6) {
            document.getElementById('reg-password-error').textContent = '密码至少6位';
            hasError = true;
        }
        if (password !== confirmPassword) {
            document.getElementById('reg-confirm-error').textContent = '两次密码不一致';
            hasError = true;
        }
        if (hasError) return;

        const btn = document.getElementById('btn-register');
        btn.disabled = true;
        btn.textContent = '注册中...';

        try {
            const res = await APP.api.post('/user/register', {
                username,
                password,
                nickname: nickname || username,
            });
            if (res && res.code === 201) {
                APP.toast('注册成功，请登录', 'success');
                activeTab = 'login';
                tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === 'login'));
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
                document.getElementById('login-username').value = username;
            }
        } catch (err) {
            document.getElementById('reg-username-error').textContent = err.message;
        } finally {
            btn.disabled = false;
            btn.textContent = '注 册';
        }
    });

    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-login').click();
        }
    });
});