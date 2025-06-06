import { menuData } from '../data/menuData.js';

/**
 * renderMenu.js
 * @fileoverview 사이드 메뉴 동적 생성 유틸리티
 */
export function renderMenu() {
  const menuList = document.querySelector('.menu-list');
  menuList.innerHTML = '';

  menuData.forEach(tab => {
    const li = document.createElement('li');
    li.className = `menu-item ${tab.tabClass}`;

    if (tab.children.length === 0) {
      li.dataset.page = tab.page;
      li.innerHTML = `
        <div class="menu-header">
          <span>${tab.title}</span>
        </div>
      `;
    } else {
      li.innerHTML = `
        <div class="menu-header">
          <span>${tab.title}</span>
          <span class="toggle-icon">▼</span>
        </div>
        <ul class="submenu">
          ${tab.children.map(child => `
            <li data-page="${child.page}">${child.title}</li>
          `).join('')}
        </ul>
      `;
    }

    // 우클릭 이벤트 추가
    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const page = li.dataset.page;
      if (page) {
        window.api.openNewWindow(page);
      }
    });

    // 서브메뉴 아이템에도 우클릭 이벤트 추가
    const submenuItems = li.querySelectorAll('.submenu li');
    submenuItems.forEach(item => {
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) {
          window.api.openNewWindow(page);
        }
      });
    });

    menuList.appendChild(li);
  });
}
