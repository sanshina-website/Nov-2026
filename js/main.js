
    // --- RFQ Cart State (LocalStorage for Multi-Page) ---
    let rfqCart = JSON.parse(localStorage.getItem('sanshina_rfq')) || [];

    function saveCart() { localStorage.setItem('sanshina_rfq', JSON.stringify(rfqCart)); }

    window.addToRFQ = function(btnElem, partNum, desc) {
      const qtyInput = btnElem.previousElementSibling;
      const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
      const existing = rfqCart.find(i => i.partNum === partNum);
      if (existing) { existing.qty += qty; } else { rfqCart.push({ partNum, desc, qty }); }
      saveCart(); updateCartBadge();
    };

    function updateCartBadge() {
      const badge = document.getElementById('rfq-badge');
      if (badge) {
        badge.innerText = rfqCart.length;
        if(rfqCart.length > 0) {
            badge.classList.remove('hidden');
            badge.classList.add('animate-bounce');
            setTimeout(() => badge.classList.remove('animate-bounce'), 1000);
        } else { badge.classList.add('hidden'); }
      }
    }

    window.updateCartQty = function(partNum, newQty) {
      const item = rfqCart.find(i => i.partNum === partNum);
      if(item) { item.qty = parseInt(newQty) || 1; saveCart(); }
    };

    window.removeFromCart = function(partNum) {
      rfqCart = rfqCart.filter(i => i.partNum !== partNum);
      saveCart(); updateCartBadge(); renderCartUI();
    };

    window.renderCartUI = function() {
        const container = document.getElementById('rfq-cart-container');
        const list = document.getElementById('rfq-cart-list');
        if(!container || !list) return;
        if(rfqCart.length === 0) { container.classList.add('hidden'); list.innerHTML = ''; return; }
        container.classList.remove('hidden');
        list.innerHTML = rfqCart.map(item => `
            <div class="flex items-center justify-between bg-white p-2 rounded border border-gray-200 shadow-sm text-sm">
                <div class="flex-1 min-w-0 pr-3">
                    <p class="font-bold text-blue-900 truncate">${item.partNum}</p>
                    <p class="text-xs text-gray-500 truncate">${item.desc}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="flex flex-col items-center">
                        <span class="text-[10px] text-gray-400 font-bold uppercase">Qty</span>
                        <input type="number" min="1" value="${item.qty}" onchange="updateCartQty('${item.partNum}', this.value)" class="w-14 p-1 border border-gray-300 rounded text-center text-sm outline-none focus:border-blue-500 bg-gray-50">
                    </div>
                    <button type="button" onclick="removeFromCart('${item.partNum}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded p-1.5 transition-colors mt-3">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        `).join('');
    };

    window.openRFQModal = function() { document.getElementById('rfq-modal').classList.remove('hidden'); renderCartUI(); };
    window.closeRFQModal = function() { document.getElementById('rfq-modal').classList.add('hidden'); };
    
    // Forms Handling
    const rfqForm = document.getElementById('rfq-form');
    if(rfqForm) rfqForm.addEventListener('submit', function(e) {
      e.preventDefault(); alert('Thank you! Your RFQ has been successfully sent. Our team will contact you shortly.'); rfqCart = []; saveCart(); updateCartBadge(); closeRFQModal(); this.reset();
    });
    window.submitAboutForm = function(e) { e.preventDefault(); alert('Thank you! Your message has been successfully sent. We will get back to you shortly.'); e.target.reset(); };
    window.submitEMSForm = function(e) { e.preventDefault(); alert('Thank you! Your EMS manufacturing enquiry has been successfully sent. Our engineering team will review your project and contact you soon.'); e.target.reset(); };
    window.submitTechLabsForm = function(e) { e.preventDefault(); alert('Thank you! Your instrumentation request has been successfully sent. Our technical sales team will be in touch shortly.'); e.target.reset(); };

    // Image fallback
    window.tryNextFormat = function(img) {
        if(img.src.endsWith('.webp')) img.src = img.src.replace('.webp', '.png');
        else if(img.src.endsWith('.png')) img.src = img.src.replace('.png', '.jpg');
        else if(img.src.endsWith('.jpg')) img.src = img.src.replace('.jpg', '.svg');
        else {
            img.style.display = 'none';
            if (img.alt) {
                const span = document.createElement('span');
                span.className = "text-sm font-bold text-gray-700 bg-gray-200 px-2 py-1 rounded inline-block";
                span.innerText = img.alt;
                img.parentNode.insertBefore(span, img);
            }
        }
    };

    // CSV Parsers & Loaders 
    function parseCSV(text) {
      const result = []; let row = [], col = "", inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        let char = text[i]; let nextChar = text[i+1];
        if (char === '"') {
          if (inQuotes && nextChar === '"') { col += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) { row.push(col.trim()); col = "";
        } else if (char === '\n' && !inQuotes) { row.push(col.trim()); if (row.length > 1 || row[0] !== "") result.push(row); row = []; col = "";
        } else if (char !== '\r') { col += char; }
      }
      if (col !== "") row.push(col.trim()); if (row.length > 0) result.push(row); return result;
    }

    let inventoryData = [], allCategories = new Set(), currentCategory = 'All';
    window.loadInventoryFromCSV = function() {
      fetch('inventory.csv').then(r => r.text()).then(csvText => {
          const rows = parseCSV(csvText);
          for(let i = 1; i < rows.length; i++) {
            if(rows[i].length < 5) continue;
            allCategories.add(rows[i][0]);
            inventoryData.push({ category: rows[i][0], partNumber: rows[i][1], manufacturer: rows[i][2], description: rows[i][3], status: rows[i][4] });
          }
          renderCategorySidebar(); renderCatalogTable('All');
      }).catch(err => console.warn(err));
    };

    function renderCategorySidebar() {
      const list = document.getElementById('category-list');
      if(!list) return;
      let html = `<li><button onclick="renderCatalogTable('All')" class="w-full text-left px-3 py-2 rounded font-medium transition-colors ${currentCategory === 'All' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'}">All Components</button></li>`;
      Array.from(allCategories).sort().forEach(cat => {
        const isActive = currentCategory === cat;
        html += `<li><button onclick="renderCatalogTable('${cat.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-2 rounded font-medium transition-colors ${isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'}">${cat}</button></li>`;
      });
      list.innerHTML = html;
    }

    window.renderCatalogTable = function(category) {
      currentCategory = category; renderCategorySidebar();
      document.getElementById('current-category-title').innerText = category === 'All' ? 'All Components' : category;
      const tbody = document.getElementById('inventory-table-body');
      if(!tbody) return;
      tbody.innerHTML = '';
      const filtered = category === 'All' ? inventoryData : inventoryData.filter(item => item.category === category);
      filtered.forEach(item => {
        const statusClass = item.status.toLowerCase().includes('stock') ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100';
        const safeDesc = item.description.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        tbody.innerHTML += `<tr class="hover:bg-blue-50 transition-colors">
          <td class="py-3 px-4 border-b border-gray-200 font-mono text-sm text-blue-900 font-semibold">${item.partNumber}</td>
          <td class="py-3 px-4 border-b border-gray-200 text-sm">${item.manufacturer}</td>
          <td class="py-3 px-4 border-b border-gray-200 text-sm text-gray-600">${item.description}</td>
          <td class="py-3 px-4 border-b border-gray-200 text-sm"><span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">${item.status}</span></td>
          <td class="py-3 px-4 border-b border-gray-200 text-sm">
            <div class="flex items-center space-x-2">
              <input type="number" min="1" value="1" class="w-16 p-1 border border-gray-300 rounded text-center text-sm outline-none focus:border-blue-500">
              <button onclick="addToRFQ(this, '${item.partNumber}', '${safeDesc}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap shadow">Add</button>
            </div>
          </td>
        </tr>`;
      });
    };

    window.loadLogosFromCSV = function() {
      fetch('logos/logos_data.csv').then(r => r.text()).then(csvText => {
          const rows = parseCSV(csvText);
          let mfgGrid = document.getElementById('mfg-grid');
          let cliMarquee = document.getElementById('client-marquee');
          let authGrid = document.getElementById('auth-grid');
          
          let mfgHtml = '', authHtml = '', cliHtml = '';
          
          for(let i = 1; i < rows.length; i++) {
            if(rows[i].length < 3) continue;
            let cat = rows[i][0], file = rows[i][1], title = rows[i][2], desc = rows[i][3] || "";
            if(cat === 'Manufacturer' && mfgGrid) {
                mfgHtml += `<div class="bg-gray-50 rounded-lg p-4 flex items-center justify-center border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors h-24"><img src="logos/${file}.webp" onerror="tryNextFormat(this)" alt="${title}" class="max-h-full max-w-full object-contain mix-blend-multiply"></div>`;
            } else if (cat === 'Client' && cliMarquee) {
                // Rendered in FULL COLOR (removed grayscale class)
                cliHtml += `<img src="logos/${file}.webp" onerror="tryNextFormat(this)" alt="${title}" class="h-12 mx-8 inline-block object-contain transition-all duration-300">`;
            } else if (cat === 'Authorization' && authGrid) {
                authHtml += `<div class="bg-white p-6 rounded-xl shadow border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow"><img src="logos/${file}.webp" onerror="tryNextFormat(this)" class="h-20 mb-4 object-contain"><h4 class="font-bold text-gray-800">${title}</h4>${desc ? `<p class="text-xs text-gray-500 mt-1">${desc}</p>` : ''}</div>`;
            }
          }
          if(mfgGrid) mfgGrid.innerHTML = mfgHtml;
          if(cliMarquee) cliMarquee.innerHTML = cliHtml + cliHtml;
          if(authGrid) authGrid.innerHTML = authHtml;
      }).catch(e => console.warn(e));
    };
    
    // Search logic for components
    const searchInput = document.getElementById('part-search');
    if(searchInput) {
        searchInput.addEventListener('input', function(e) {
          const term = e.target.value.toLowerCase();
          const rows = document.querySelectorAll('#inventory-table-body tr');
          rows.forEach(row => {
            if(row.cells.length < 5) return;
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
          });
        });
    }

    window.onload = () => {
      updateCartBadge();
      if(document.getElementById('inventory-table-body')) loadInventoryFromCSV();
      if(document.getElementById('mfg-grid') || document.getElementById('client-marquee')) loadLogosFromCSV();
    };
    