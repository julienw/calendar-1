import MainController from './controllers/main';

const mainController = new MainController();
window.app = mainController;
mainController.main();
