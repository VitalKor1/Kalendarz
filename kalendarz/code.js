'use strict';

const state = {
  rok: new Date().getFullYear(),
  miesiac: new Date().getMonth() + 1,
  dane: {},
  loading: false
};

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];

const overlay = document.getElementById('overlay');
const popupBody = document.getElementById('popupBody');
const popupTitle = document.getElementById('popupTitle');
const calGrid = document.getElementById('calGrid');

function pad(v) {
  return String(v).padStart(2, '0');
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function fmtDate(value) {
  const d = new Date(value);

  return d.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function fmtTime(value) {
  return value.slice(11, 16);
}

function showToast(text, isError = false) {
  const toast = document.getElementById('toast');

  toast.textContent = text;
  toast.className = isError ? 'err' : '';

  toast.classList.add('show');

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function create(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      node.className = value;
      continue;
    }

    if (key === 'text') {
      node.textContent = value;
      continue;
    }

    if (key.startsWith('data-')) {
      node.dataset[key.slice(5)] = value;
      continue;
    }

    node.setAttribute(key, value);
  }

  for (const child of children) {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
      continue;
    }

    if (child) {
      node.appendChild(child);
    }
  }

  return node;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Błąd serwera');
  }

  return data;
}

async function pobierzMiesiac() {
  if (state.loading) {
    return;
  }

  state.loading = true;

  try {
    const response = await apiFetch(
      `api.php?action=miesiac&rok=${state.rok}&miesiac=${state.miesiac}`
    );

    state.dane = response.dane || {};

    renderCalendar();
  } catch (e) {
    showToast(`Nie udało się pobrać danych: ${e.message}`, true);
  } finally {
    state.loading = false;
  }
}

async function dodajZdarzenie(data) {
  return apiFetch('api.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

async function usunZdarzenie(id) {
  return apiFetch(`api.php?id=${id}`, {
    method: 'DELETE'
  });
}

function renderCalendar() {
  clearNode(calGrid);

  for (const day of DAYS_PL) {
    calGrid.appendChild(
      create('div', {
        class: 'day-header',
        'aria-hidden': 'true'
      }, [day])
    );
  }

  document.getElementById('monthLabel').textContent =
    `${MONTHS_PL[state.miesiac - 1]} ${state.rok}`;

  const firstDay = new Date(state.rok, state.miesiac - 1, 1);
  const lastDay = new Date(state.rok, state.miesiac, 0);

  const startDow = (firstDay.getDay() + 6) % 7;

  const now = new Date();

  const todayStr = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('-');

  for (let i = 0; i < startDow; i++) {
    calGrid.appendChild(
      create('div', {
        class: 'day-cell empty',
        'aria-hidden': 'true'
      })
    );
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr =
      `${state.rok}-${pad(state.miesiac)}-${pad(day)}`;

    const zdarzenia = state.dane[dateStr] || [];
    const isToday = dateStr === todayStr;

    const cell = create('div', {
      class: `day-cell${isToday ? ' today' : ''}`,
      role: 'button',
      tabindex: '0',
      'aria-label':
        `${day} ${MONTHS_PL[state.miesiac - 1]}, ${zdarzenia.length} zdarzeń`,
      'data-date': dateStr
    });

    cell.appendChild(
      create('div', {
        class: 'day-num'
      }, [String(day)])
    );

    if (zdarzenia.length) {
      const wrapper = create('div', {
        class: 'day-events'
      });

      const visible = zdarzenia.slice(0, 2);

      for (const item of visible) {
        wrapper.appendChild(
          create('div', {
            class: `ev-chip ${item.typ}`
          }, [item.tytul])
        );
      }

      if (zdarzenia.length > 2) {
        wrapper.appendChild(
          create('div', {
            class: 'ev-more'
          }, [`+${zdarzenia.length - 2} więcej`])
        );
      }

      cell.appendChild(wrapper);
    }

    cell.addEventListener('click', () => {
      onDayClick(dateStr, zdarzenia);
    });

    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDayClick(dateStr, zdarzenia);
      }
    });

    calGrid.appendChild(cell);
  }
}

function openOverlay() {
  overlay.classList.add('visible');
  document.getElementById('popupClose').focus();
}

function closeOverlay() {
  overlay.classList.remove('visible');
}

function onDayClick(dateStr, zdarzenia) {
  if (zdarzenia.length) {
    showEventsPopup(dateStr, zdarzenia);
    return;
  }

  showFormPopup(dateStr);
}

function showEventsPopup(dateStr, zdarzenia) {
  popupTitle.textContent =
    fmtDate(`${dateStr}T00:00:00`);

  clearNode(popupBody);

  const list = create('ul', {
    class: 'events-list'
  });

  for (const item of zdarzenia) {
    const li = create('li', {
      class: 'event-item'
    });

    const badge = create('span', {
      class: `event-badge ${item.typ}`
    }, [item.typ]);

    const info = create('div', {
      class: 'event-info'
    });

    info.appendChild(
      create('strong', {}, [item.tytul])
    );

    info.appendChild(
      create('span', {}, [fmtTime(item.data_czas)])
    );

    if (item.opis) {
      info.appendChild(
        create('p', {}, [item.opis])
      );
    }

    const delBtn = create('button', {
      class: 'event-delete',
      'aria-label': `Usuń zdarzenie ${item.tytul}`
    }, ['✕']);

    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      delBtn.textContent = '…';

      try {
        await usunZdarzenie(item.id);

        showToast('Zdarzenie usunięto.');

        closeOverlay();

        await pobierzMiesiac();
      } catch (e) {
        showToast(`Nie udało się usunąć: ${e.message}`, true);

        delBtn.disabled = false;
        delBtn.textContent = '✕';
      }
    });

    li.appendChild(badge);
    li.appendChild(info);
    li.appendChild(delBtn);

    list.appendChild(li);
  }

  popupBody.appendChild(list);

  const addBtn = create('button', {
    class: 'btn-add'
  }, ['+ Dodaj nowe zdarzenie w tym dniu']);

  addBtn.addEventListener('click', () => {
    showFormPopup(dateStr);
  });

  popupBody.appendChild(addBtn);

  openOverlay();
}

function showFormPopup(dateStr) {
  popupTitle.textContent = 'Nowe zdarzenie';

  clearNode(popupBody);

  const err = create('div', {
    class: 'form-error',
    role: 'alert',
    id: 'formErr'
  });

  popupBody.appendChild(err);

  const selTyp = create('select', {
    id: 'fTyp',
    required: ''
  });

  selTyp.appendChild(
    create('option', { value: 'zadanie' }, ['Zadanie'])
  );

  selTyp.appendChild(
    create('option', { value: 'spotkanie' }, ['Spotkanie'])
  );

  popupBody.appendChild(
    create('div', { class: 'form-group' }, [
      create('label', { for: 'fTyp' }, ['Typ zdarzenia']),
      selTyp
    ])
  );

  const inpTitle = create('input', {
    type: 'text',
    id: 'fTytul',
    maxlength: '255',
    placeholder: 'Wpisz tytuł…',
    required: ''
  });

  popupBody.appendChild(
    create('div', { class: 'form-group' }, [
      create('label', { for: 'fTytul' }, ['Tytuł']),
      inpTitle
    ])
  );

  const inpDate = create('input', {
    type: 'datetime-local',
    id: 'fData',
    required: ''
  });

  inpDate.value = `${dateStr}T09:00`;

  popupBody.appendChild(
    create('div', { class: 'form-group' }, [
      create('label', { for: 'fData' }, ['Data i godzina']),
      inpDate
    ])
  );

  const taOpis = create('textarea', {
    id: 'fOpis',
    rows: '3',
    placeholder: 'Opcjonalny opis…'
  });

  popupBody.appendChild(
    create('div', { class: 'form-group' }, [
      create('label', { for: 'fOpis' }, ['Opis']),
      taOpis,
      create('span', {
        class: 'hint'
      }, ['Pole opcjonalne'])
    ])
  );

  const btnCancel = create('button', {
    class: 'btn btn-secondary',
    type: 'button'
  }, ['Anuluj']);

  btnCancel.addEventListener('click', closeOverlay);

  const btnSave = create('button', {
    class: 'btn btn-primary',
    type: 'button'
  }, ['Zapisz']);

  btnSave.addEventListener('click', async () => {
    const typ = selTyp.value;
    const tytul = inpTitle.value.trim();
    const data_czas = inpDate.value;
    const opis = taOpis.value.trim();

    if (!tytul) {
      err.textContent = 'Tytuł jest wymagany.';
      err.classList.add('visible');

      inpTitle.focus();

      return;
    }

    if (!data_czas) {
      err.textContent = 'Data i godzina są wymagane.';
      err.classList.add('visible');

      inpDate.focus();

      return;
    }

    err.classList.remove('visible');

    btnSave.disabled = true;

    clearNode(btnSave);

    btnSave.appendChild(
      create('span', {
        class: 'spinner',
        'aria-hidden': 'true'
      })
    );

    btnSave.appendChild(
      document.createTextNode('Zapisywanie…')
    );

    try {
      await dodajZdarzenie({
        typ,
        tytul,
        data_czas,
        opis
      });

      showToast('Zdarzenie dodano pomyślnie!');

      closeOverlay();

      await pobierzMiesiac();
    } catch (e) {
      err.textContent = e.message;
      err.classList.add('visible');

      btnSave.disabled = false;

      clearNode(btnSave);

      btnSave.appendChild(
        document.createTextNode('Zapisz')
      );
    }
  });

  popupBody.appendChild(
    create('div', { class: 'btn-row' }, [
      btnCancel,
      btnSave
    ])
  );

  openOverlay();

  inpTitle.focus();
}

document.getElementById('btnPrev').addEventListener('click', () => {
  state.miesiac--;

  if (state.miesiac < 1) {
    state.miesiac = 12;
    state.rok--;
  }

  pobierzMiesiac();
});

document.getElementById('btnNext').addEventListener('click', () => {
  state.miesiac++;

  if (state.miesiac > 12) {
    state.miesiac = 1;
    state.rok++;
  }

  pobierzMiesiac();
});

document.getElementById('popupClose').addEventListener('click', closeOverlay);

overlay.addEventListener('click', e => {
  if (e.target === overlay) {
    closeOverlay();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeOverlay();
  }
});

pobierzMiesiac();