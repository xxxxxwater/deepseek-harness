/** Keep the chat palette scoped to this enabled local plugin. */
window.__ModuleLoader__.load({ id: 'dsh-imessage-blue', factory: () => ({
 name: 'imessage-blue-client', inject: [],
 apply(ctx) {
  ctx.effect(() => {
   const style = document.createElement('style'); style.id = 'dsh-imessage-blue';
   style.textContent = "\n:root, body, body[data-ds-dark-theme] {\n --dsw-specific-bubble: #0a64d8 !important;\n --dsw-specific-bubble-highlight: #0755b6 !important;\n --dsw-alias-button-info-fill: #0a64d8 !important;\n --dsw-alias-button-info-hover: #0755b6 !important;\n --dsw-alias-state-business-primary: #2485ed !important;\n}\nbody { --dsw-specific-input-major: #edf4ff !important; }\nbody[data-ds-dark-theme] { --dsw-specific-input-major: #182538 !important; }\nbody [class$=\"_bubble\"] {\n color: #ffffff !important;\n --dsw-alias-label-primary: #ffffff;\n --dsw-alias-label-secondary: #e6efff;\n border-radius: 20px 20px 5px 20px;\n}\nbody [class$=\"_bubble\"] a { color: #ffffff !important; text-decoration: underline; }\nbody [class$=\"_bubble\"] ::selection { background: #00499c; color: #ffffff; }\n";
   document.head.append(style); return () => style.remove();
  }, 'imessage-blue: chat palette');
 }
}) });
