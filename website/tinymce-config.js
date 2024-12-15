export function initTinyMCE() {
    return tinymce.init({
        selector: '#tinymce-editor',
        height: 300,
        menubar: false,
        base_url: './public/tinymce',
        plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'preview',
            'anchor',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'media',
            'table',
            'help',
            'wordcount'
        ],
        toolbar: 'undo redo | formatselect | ' +
                'bold italic backcolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        setup: function(editor) {
            editor.on('focus', function() {
                editor.getContainer().dispatchEvent(new Event('focus', { bubbles: true }));
            });
            
            editor.on('blur', function() {
                editor.getContainer().dispatchEvent(new Event('blur', { bubbles: true }));
            });
        }
    });
} 