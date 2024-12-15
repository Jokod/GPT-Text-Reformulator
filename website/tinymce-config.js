export function initTinyMCE() {
    return new Promise((resolve) => {
        tinymce.init({
            selector: '#tinymce-editor',
            height: 300,
            menubar: false,
            plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'],
            toolbar: 'undo redo | formatselect | bold italic | ' +
                'alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | help',
            setup: function(editor) {
                editor.on('init', function() {
                    resolve(editor);
                });
                
                // Gérer le focus et blur de l'éditeur
                editor.on('focus', function() {
                    editor.getContainer().dispatchEvent(new Event('focus', { bubbles: true }));
                });
                
                editor.on('blur', function() {
                    editor.getContainer().dispatchEvent(new Event('blur', { bubbles: true }));
                });
            }
        });
    });
} 