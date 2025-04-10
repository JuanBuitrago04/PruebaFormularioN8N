 // Elementos del DOM
 const form = document.getElementById('cedulaForm');
 const fileInput = document.getElementById('fileInput');
 const uploadArea = document.getElementById('uploadArea');
 const filePreview = document.getElementById('filePreview');
 const previewContainer = document.getElementById('previewContainer');
 const fileName = document.getElementById('fileName');
 const fileSize = document.getElementById('fileSize');
 const submitBtn = document.getElementById('submitBtn');
 const loading = document.getElementById('loading');
 const resultado = document.getElementById('resultado');
 const resultadoContent = document.getElementById('resultadoContent');
 const errorAlert = document.getElementById('errorAlert');
 const errorMessage = document.getElementById('errorMessage');
 const successAlert = document.getElementById('successAlert');
 const successMessage = document.getElementById('successMessage');
 
 // Eventos para arrastrar y soltar
 ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
   uploadArea.addEventListener(eventName, preventDefaults, false);
 });
 
 function preventDefaults(e) {
   e.preventDefault();
   e.stopPropagation();
 }
 
 ['dragenter', 'dragover'].forEach(eventName => {
   uploadArea.addEventListener(eventName, highlight, false);
 });
 
 ['dragleave', 'drop'].forEach(eventName => {
   uploadArea.addEventListener(eventName, unhighlight, false);
 });
 
 function highlight() {
   uploadArea.classList.add('drag-active');
 }
 
 function unhighlight() {
   uploadArea.classList.remove('drag-active');
 }
 
 // Manejar archivos soltados
 uploadArea.addEventListener('drop', handleDrop, false);
 
 function handleDrop(e) {
   const dt = e.dataTransfer;
   const files = dt.files;
   fileInput.files = files;
   handleFiles(files);
 }
 
 // Manejar selección de archivo
 fileInput.addEventListener('change', function() {
   handleFiles(this.files);
 });
 
 function handleFiles(files) {
   if (files.length > 0) {
     const file = files[0];
     
     // Validar tipo de archivo
     const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
     if (!validTypes.includes(file.type)) {
       showError('El formato del archivo no es válido. Por favor, sube una imagen (JPG, PNG) o un PDF.');
       resetForm();
       return;
     }
     
     // Validar tamaño (máximo 5MB)
     const maxSize = 5 * 1024 * 1024; // 5MB
     if (file.size > maxSize) {
       showError('El archivo es demasiado grande. El tamaño máximo permitido es 5MB.');
       resetForm();
       return;
     }
     
     // Mostrar vista previa
     showFilePreview(file);
     
     // Habilitar botón de envío
     submitBtn.disabled = false;
     
     // Ocultar alertas
     hideAlerts();
   }
 }
 
 function showFilePreview(file) {
   filePreview.style.display = 'block';
   
   // Mostrar nombre y tamaño del archivo
   fileName.textContent = file.name;
   fileSize.textContent = formatFileSize(file.size);
   
   // Limpiar vista previa anterior
   previewContainer.innerHTML = '';
   
   // Crear vista previa según el tipo de archivo
   if (file.type.startsWith('image/')) {
     const img = document.createElement('img');
     img.file = file;
     previewContainer.appendChild(img);
     
     const reader = new FileReader();
     reader.onload = (function(aImg) { 
       return function(e) { 
         aImg.src = e.target.result; 
       }; 
     })(img);
     reader.readAsDataURL(file);
   } else if (file.type === 'application/pdf') {
     const icon = document.createElement('i');
     icon.className = 'fas fa-file-pdf';
     icon.style.fontSize = '50px';
     icon.style.color = '#e74c3c';
     icon.style.margin = '10px 0';
     previewContainer.appendChild(icon);
   }
 }
 
 function formatFileSize(bytes) {
   if (bytes < 1024) {
     return bytes + ' bytes';
   } else if (bytes < 1024 * 1024) {
     return (bytes / 1024).toFixed(2) + ' KB';
   } else {
     return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
   }
 }
 
 // Manejar envío del formulario
 form.addEventListener('submit', async function(e) {
   e.preventDefault();
   
   // Mostrar loading y ocultar otros elementos
   loading.style.display = 'block';
   hideAlerts();
   resultado.style.display = 'none';
   submitBtn.disabled = true;
   
   const formData = new FormData(this);
   
   try {
     const response = await fetch('https://mrx04.app.n8n.cloud/webhook/ocr', {
       method: 'POST',
       body: formData
     });
     
     if (!response.ok) {
       throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
     }
     
     // Leer el contenido en texto para depurar
     const text = await response.text();
     
     if (text.trim() === "") {
       throw new Error('La respuesta está vacía. Revisa tu flujo en n8n.');
     }
     
     let data;
     try {
       data = JSON.parse(text);
     } catch (error) {
       throw new Error(`La respuesta no es JSON válido: ${text}`);
     }
     
     // Mostrar resultado
     showSuccess('Documento procesado correctamente');
     displayResults(data);
   } catch (error) {
     showError(error.message);
     console.error(error);
   } finally {
     loading.style.display = 'none';
     submitBtn.disabled = false;
   }
 });
 
 function displayResults(data) {
   resultado.style.display = 'block';
   
   // Formatear los datos para mostrarlos de manera amigable
   if (typeof data === 'object' && data !== null) {
     let html = '';
     
     // Si es una estructura plana, mostrar como tabla
     if (!Array.isArray(data) && typeof data === 'object') {
       html = '<table class="data-table">';
       html += '<tr><th>Campo</th><th>Valor</th><th></th></tr>';
       
       for (const [key, value] of Object.entries(data)) {
         if (typeof value !== 'object') {
           html += `
             <tr>
               <td><strong>${formatFieldName(key)}</strong></td>
               <td>${value}</td>
               <td>
                 <button class="copy-btn" onclick="copyToClipboard('${value}')">
                   <i class="fas fa-copy"></i>
                 </button>
               </td>
             </tr>
           `;
         }
       }
       
       html += '</table>';
     } else {
       // Para estructuras más complejas, usar formato JSON con formato
       html = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
     }
     
     resultadoContent.innerHTML = html;
   } else {
     resultadoContent.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
   }
 }
 
 function formatFieldName(key) {
   // Convertir camelCase o snake_case a texto legible
   return key
     .replace(/_/g, ' ')
     .replace(/([A-Z])/g, ' $1')
     .replace(/^./, str => str.toUpperCase());
 }
 
 function showError(message) {
   errorMessage.textContent = message;
   errorAlert.style.display = 'block';
   successAlert.style.display = 'none';
   
   // Auto-ocultar después de 5 segundos
   setTimeout(() => {
     errorAlert.style.display = 'none';
   }, 5000);
 }
 
 function showSuccess(message) {
   successMessage.textContent = message;
   successAlert.style.display = 'block';
   errorAlert.style.display = 'none';
   
   // Auto-ocultar después de 5 segundos
   setTimeout(() => {
     successAlert.style.display = 'none';
   }, 5000);
 }
 
 function hideAlerts() {
   errorAlert.style.display = 'none';
   successAlert.style.display = 'none';
 }
 
 function resetForm() {
   fileInput.value = '';
   filePreview.style.display = 'none';
   submitBtn.disabled = true;
 }
 
 // Función para copiar al portapapeles
 function copyToClipboard(text) {
   navigator.clipboard.writeText(text).then(
     function() {
       showSuccess('Texto copiado al portapapeles');
     },
     function(err) {
       showError('No se pudo copiar el texto');
       console.error('Error al copiar: ', err);
     }
   );
 }
 
 // Agregar la función al ámbito global para que se pueda llamar desde el HTML
 window.copyToClipboard = copyToClipboard;