/**
 * MultiPointMapper v2.0 — Thème de question pour LimeSurvey
 *
 * Corrections v2 :
 *  - Gestion par référence d'objet (plus d'index) → corrige le bug de closure
 *  - Popup créé comme élément DOM → les event listeners ne s'accumulent pas
 *  - Flag ignoreNextClick → empêche l'ajout accidentel d'un point lors de la
 *    fermeture d'un popup (le clic de fermeture était propagé à la carte)
 *  - Sérialisation propre du JSON (exclut les propriétés internes Leaflet)
 */

function initMultiPointMapper(questionId) {

    var container = document.getElementById('container-' + questionId);
    if (!container) return;

    var mapElement  = document.getElementById('map-' + questionId);
    var inputElement = document.getElementById('answer' + questionId);
    var counterEl   = container.querySelector('.mpm-counter');

    /* ── Paramètres ────────────────────────────────────────────────────── */
    var maxPoints    = parseInt(container.getAttribute('data-max-points'))  || 0;
    var freqOptionsStr = container.getAttribute('data-frequency-options')   || '';
    var freqOptions  = freqOptionsStr.split(';').map(function(s){ return s.trim(); }).filter(Boolean);
    var mapCenterStr = container.getAttribute('data-map-center')            || '46.603354, 1.888334';
    var defaultZoom  = parseInt(container.getAttribute('data-default-zoom')) || 6;
    var centerCoords = mapCenterStr.split(',').map(function(c){ return parseFloat(c.trim()); });

    /* ── Initialisation Leaflet ────────────────────────────────────────── */
    var map = L.map(mapElement, { tap: false }).setView(centerCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    /* ── État ──────────────────────────────────────────────────────────── */
    var markersData     = [];   // [{id, lat, lng, name, freq, _marker}, ...]
    var idCounter       = 0;
    var ignoreNextClick = false; // bloque le clic parasite après fermeture de popup

    /* ── Helpers ───────────────────────────────────────────────────────── */

    /** Sérialise uniquement les champs utiles (exclut _marker, etc.) */
    function serialize() {
        return JSON.stringify(markersData.map(function(d) {
            return { id: d.id, lat: d.lat, lng: d.lng, name: d.name, freq: d.freq };
        }));
    }

    function updateHiddenInput() {
        inputElement.value = serialize();
        // Déclenche la revalidation LimeSurvey
        var ev = document.createEvent('Event');
        ev.initEvent('change', true, true);
        inputElement.dispatchEvent(ev);
        updateCounter();
    }

    function updateCounter() {
        if (!counterEl) return;
        var n   = markersData.length;
        var max = (maxPoints > 0) ? ' / ' + maxPoints : '';
        counterEl.textContent = n + max + ' point' + (n > 1 ? 's' : '') + ' placé' + (n > 1 ? 's' : '');
    }

    /* ── Popup (créé en DOM pour éviter la réattache des listeners) ────── */

    function makeField(labelText, el) {
        var group = document.createElement('div');
        group.className = 'mpm-field-group';
        var lbl = document.createElement('label');
        lbl.className = 'mpm-label';
        lbl.textContent = labelText;
        group.appendChild(lbl);
        group.appendChild(el);
        return group;
    }

    /**
     * Crée l'élément DOM du popup.
     * Les listeners pointent directement sur l'objet pointData,
     * indépendamment de sa position dans markersData.
     */
    function createPopupElement(pointData) {
        var div = document.createElement('div');
        div.className = 'mpm-popup-form';

        /* -- Titre numéroté ---------------------------------------- */
        var title = document.createElement('p');
        title.className = 'mpm-popup-title';
        var idx = markersData.indexOf(pointData) + 1;
        title.textContent = 'Point n°' + idx;
        div.appendChild(title);

        /* -- Champ Nom --------------------------------------------- */
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'mpm-input-name';
        nameInput.value = pointData.name || '';
        nameInput.placeholder = 'Ex : Carrefour City, Leclerc…';
        nameInput.addEventListener('input', function(e) {
            pointData.name = e.target.value;
            updateHiddenInput();
        });
        // Empêcher que la touche Entrée soumette le formulaire LimeSurvey
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') e.preventDefault();
        });
        div.appendChild(makeField('Nom du point de vente :', nameInput));

        /* -- Champ Fréquence --------------------------------------- */
        var freqSelect = document.createElement('select');
        freqSelect.className = 'mpm-input-freq';

        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '— Choisir une fréquence —';
        freqSelect.appendChild(defaultOpt);

        freqOptions.forEach(function(opt) {
            var o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (pointData.freq === opt) o.selected = true;
            freqSelect.appendChild(o);
        });

        freqSelect.addEventListener('change', function(e) {
            pointData.freq = e.target.value;
            updateHiddenInput();
        });
        div.appendChild(makeField('Fréquence de visite :', freqSelect));

        /* -- Coordonnées (lecture seule, repliable) ----------------- */
        var coords = document.createElement('p');
        coords.className = 'mpm-coords';
        coords.textContent = 'Lat : ' + pointData.lat.toFixed(5) + ' — Lng : ' + pointData.lng.toFixed(5);
        div.appendChild(coords);

        /* -- Bouton Supprimer -------------------------------------- */
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'mpm-btn-delete';
        delBtn.textContent = '🗑 Supprimer ce point';
        delBtn.addEventListener('click', function() {
            // Signale qu'on est en train de fermer via un bouton (pas un clic carte)
            ignoreNextClick = true;
            setTimeout(function() { ignoreNextClick = false; }, 400);
            removeMarker(pointData);
        });
        div.appendChild(delBtn);

        return div;
    }

    /* ── Suppression ───────────────────────────────────────────────────── */

    function removeMarker(pointData) {
        if (pointData._marker) {
            pointData._marker.closePopup();
            map.removeLayer(pointData._marker);
        }
        markersData = markersData.filter(function(d) { return d !== pointData; });
        updateHiddenInput();
    }

    /* ── Ajout d'un marqueur ───────────────────────────────────────────── */

    function addMarkerToMap(pointData) {
        var marker = L.marker([pointData.lat, pointData.lng], {
            title: pointData.name || 'Point sans nom'
        }).addTo(map);

        pointData._marker = marker; // référence interne (non sérialisée)

        var popupEl = createPopupElement(pointData);
        marker.bindPopup(popupEl, {
            minWidth: 240,
            maxWidth: 300,
            autoPan: true,
            closeButton: true
        });

        // Focus automatique sur le champ nom à l'ouverture du popup
        marker.on('popupopen', function() {
            var input = popupEl.querySelector('.mpm-input-name');
            if (input && !input.value) {
                setTimeout(function() { input.focus(); }, 50);
            }
        });

        return marker;
    }

    /* ── Chargement des données existantes (reprise après navigation) ──── */

    try {
        if (inputElement.value && inputElement.value !== '') {
            var loaded = JSON.parse(inputElement.value);
            if (Array.isArray(loaded)) {
                loaded.forEach(function(d) {
                    var pt = {
                        id:   d.id   || ++idCounter,
                        lat:  d.lat,
                        lng:  d.lng,
                        name: d.name || '',
                        freq: d.freq || ''
                    };
                    markersData.push(pt);
                    addMarkerToMap(pt);
                });
                // Adapter le zoom si des points existent
                if (markersData.length > 0) {
                    var leafletMarkers = markersData.map(function(d) { return d._marker; }).filter(Boolean);
                    var group = L.featureGroup(leafletMarkers);
                    map.fitBounds(group.getBounds().pad(0.2));
                }
            }
        }
    } catch(e) {
        console.error('[MultiPointMapper] Erreur de parsing JSON :', e);
    }

    /* ── Gestion du clic parasite (fermeture popup → clic carte) ───────── */

    map.on('popupclose', function() {
        ignoreNextClick = true;
        setTimeout(function() { ignoreNextClick = false; }, 350);
    });

    /* ── Clic sur la carte : ajout d'un point ──────────────────────────── */

    map.on('click', function(e) {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
        }

        if (maxPoints > 0 && markersData.length >= maxPoints) {
            alert('Nombre maximum de points atteint (' + maxPoints + '). Supprimez un point pour en ajouter un autre.');
            return;
        }

        var newPoint = {
            id:   ++idCounter,
            lat:  e.latlng.lat,
            lng:  e.latlng.lng,
            name: '',
            freq: ''
        };

        markersData.push(newPoint);
        var marker = addMarkerToMap(newPoint);
        updateHiddenInput();

        // Léger délai pour laisser Leaflet traiter le clic avant l'ouverture
        setTimeout(function() {
            marker.openPopup();
        }, 30);
    });

    /* ── Init compteur ─────────────────────────────────────────────────── */
    updateCounter();
}
