'use strict';

let deferredInstallPrompt = null;
const installPWASection = document.querySelector("section.pwaInstall")
const installButton = document.getElementById('butInstall');
installButton.addEventListener('click', installPWA);

window.addEventListener('beforeinstallprompt', saveBeforeInstallPromptEvent);

/**
 * Event handler for beforeinstallprompt event.
 *   Saves the event & shows install button.
 *
 * @param {Event} evt
 */
function saveBeforeInstallPromptEvent(evt) {
  deferredInstallPrompt = evt;
  installPWASection.classList.remove('hidden');
}


/**
 * Event handler for butInstall - Does the PWA installation.
 *
 * @param {Event} evt
 */
function installPWA(evt) {
  deferredInstallPrompt.prompt();
  installPWASection.classList.add("hidden")
  
  deferredInstallPrompt.userChoice
  .then((choice) => {
    if (choice.outcome === 'accepted') {
      console.log('User accepted the A2HS prompt', choice);
    } else {
      console.log('User dismissed the A2HS prompt', choice);
    }
    deferredInstallPrompt = null;
  });
}

window.addEventListener('appinstalled', logAppInstalled);

/**
 * Event handler for appinstalled event.
 *   Log the installation to analytics or save the event somehow.
 *
 * @param {Event} evt
 */
function logAppInstalled(evt) {
  console.log('G4 was installed.', evt);
}