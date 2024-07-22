import {initMenuBar} from '../menu-bar';
import {BrowserWindow, Menu, MenuItemConstructorOptions, shell} from 'electron';
import {
	chooseStoryDirectoryPath,
	revealStoryDirectory
} from '../story-directory';
import {getAppPref} from '../app-prefs';
import {toggleHardwareAcceleration} from '../hardware-acceleration';

jest.mock('electron');
jest.mock('../app-prefs');
jest.mock('../hardware-acceleration');
jest.mock('../story-directory');

function hasItemWithRole(menu: MenuItemConstructorOptions, roleName: string) {
	return (
		menu.submenu &&
		(menu.submenu as MenuItemConstructorOptions[]).some(
			item => item.role === roleName
		)
	);
}

describe('initMenuBar', () => {
	const chooseStoryDirectoryPathMock = chooseStoryDirectoryPath as jest.Mock;
	const getAppPrefMock = getAppPref as jest.Mock;
	const toggleHardwareAccelerationMock =
		toggleHardwareAcceleration as jest.Mock;
	let openDevToolsMock: jest.Mock;
	const openExternalMock = shell.openExternal as jest.Mock;
	const revealStoryDirectoryMock = revealStoryDirectory as jest.Mock;
	let setApplicationMenuSpy: jest.SpyInstance;

	beforeEach(() => {
		getAppPrefMock.mockImplementation((name: string) => {
			if (name === 'disableHardwareAcceleration') {
				return undefined;
			}

			throw new Error(`Asked for a unmocked app pref: ${name}`);
		});
		setApplicationMenuSpy = jest.spyOn(Menu, 'setApplicationMenu');
		openDevToolsMock = jest.fn();
		(BrowserWindow.getFocusedWindow as jest.Mock).mockReturnValue({
			webContents: {openDevTools: openDevToolsMock}
		});
	});

	describe('on macOS', () => {
		let oldPlatform: NodeJS.Platform;

		beforeEach(() => {
			oldPlatform = process.platform;
			Object.defineProperty(process, 'platform', {value: 'darwin'});
			initMenuBar();
		});

		afterAll(() => {
			Object.defineProperty(process, 'platform', {value: oldPlatform});
		});

		it('creates an application menu with standard menu items', () => {
			const menu1 = setApplicationMenuSpy.mock.calls[0][0][0];

			expect(menu1.label).toBe('mock-electron-app-name');
			expect(hasItemWithRole(menu1, 'about')).toBe(true);
			expect(hasItemWithRole(menu1, 'services')).toBe(true);
			expect(hasItemWithRole(menu1, 'hide')).toBe(true);
			expect(hasItemWithRole(menu1, 'hideOthers')).toBe(true);
			expect(hasItemWithRole(menu1, 'unhide')).toBe(true);
			expect(hasItemWithRole(menu1, 'quit')).toBe(true);
		});

		it('creates an Edit menu with standard menu items', () => {
			const menu2 = setApplicationMenuSpy.mock.calls[0][0][1];

			expect(menu2.label).toBe('electron.menuBar.edit');
			expect(hasItemWithRole(menu2, 'undo')).toBe(true);
			expect(hasItemWithRole(menu2, 'redo')).toBe(true);
			expect(hasItemWithRole(menu2, 'cut')).toBe(true);
			expect(hasItemWithRole(menu2, 'copy')).toBe(true);
			expect(hasItemWithRole(menu2, 'paste')).toBe(true);
			expect(hasItemWithRole(menu2, 'delete')).toBe(true);
			expect(hasItemWithRole(menu2, 'selectAll')).toBe(true);
		});

		it('creates a View menu with standard menu items', () => {
			const menu3 = setApplicationMenuSpy.mock.calls[0][0][2];

			expect(menu3.label).toBe('electron.menuBar.view');
			expect(hasItemWithRole(menu3, 'resetZoom')).toBe(true);
			expect(hasItemWithRole(menu3, 'zoomIn')).toBe(true);
			expect(hasItemWithRole(menu3, 'zoomOut')).toBe(true);
			expect(hasItemWithRole(menu3, 'togglefullscreen')).toBe(true);
		});

		it('adds a Set Story Library Folder menu item to the application menu', () => {
			const item = setApplicationMenuSpy.mock.calls[0][0][0].submenu.find(
				(item: any) => item.label === 'electron.menuBar.setStoryLibraryFolder'
			);

			expect(item).not.toBeUndefined();
			item.click();
			expect(chooseStoryDirectoryPathMock).toBeCalledTimes(1);
		});

		it('adds a Show Story Library menu item to the View menu', () => {
			const item = setApplicationMenuSpy.mock.calls[0][0][2].submenu.find(
				(item: any) => item.label === 'electron.menuBar.showStoryLibrary'
			);

			expect(item).not.toBeUndefined();
			item.click();
			expect(revealStoryDirectoryMock).toBeCalledTimes(1);
		});

		it('creates a Window menu with standard menu items', () => {
			const menu4 = setApplicationMenuSpy.mock.calls[0][0][3];

			expect(menu4.role).toBe('window');
			expect(hasItemWithRole(menu4, 'minimize')).toBe(true);
			expect(hasItemWithRole(menu4, 'close')).toBe(true);
			expect(hasItemWithRole(menu4, 'zoom')).toBe(true);
			expect(hasItemWithRole(menu4, 'front')).toBe(true);
		});

		describe('creates a Help menu', () => {
			it('has a Twine Help menu item', () => {
				const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];

				expect(menu5.role).toBe('help');

				const item = menu5.submenu.find(
					(item: any) => item.label === 'electron.menuBar.twineHelp'
				);

				expect(item).not.toBeUndefined();
				item.click();
				expect(openExternalMock.mock.calls).toEqual([
					['https://twinery.org/2guide']
				]);
			});

			it('has a Show Debug Console menu item', () => {
				const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
				const item = menu5.submenu
					.find(
						(item: any) => item.label === 'electron.menuBar.troubleshooting'
					)
					.submenu.find(
						(item: any) => item.label === 'electron.menuBar.showDevTools'
					);

				expect(item).not.toBeUndefined();
				item.click();
				expect(openDevToolsMock).toBeCalled();
			});

			describe('its Disable Hardware Acceleration menu item', () => {
				it('calls toggleHardwareAcceleration when clicked', () => {
					const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
					const item = menu5.submenu
						.find(
							(item: any) => item.label === 'electron.menuBar.troubleshooting'
						)
						.submenu.find(
							(item: any) =>
								item.label === 'electron.menuBar.disableHardwareAcceleration'
						);

					expect(item).not.toBeUndefined();
					item.click();
					expect(toggleHardwareAccelerationMock).toBeCalledTimes(1);
				});

				it('is unchecked if the pref is falsy', () => {
					const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
					const item = menu5.submenu
						.find(
							(item: any) => item.label === 'electron.menuBar.troubleshooting'
						)
						.submenu.find(
							(item: any) =>
								item.label === 'electron.menuBar.disableHardwareAcceleration'
						);

					expect(item).not.toBeUndefined();
					expect(item.checked).toBe(false);
				});

				it('is checked if the pref is truthy', () => {
					getAppPrefMock.mockImplementation((name: string) => {
						if (name === 'disableHardwareAcceleration') {
							return 'true';
						}

						throw new Error(`Asked for a unmocked app pref: ${name}`);
					});
					setApplicationMenuSpy.mockClear();
					initMenuBar();

					const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
					const item = menu5.submenu
						.find(
							(item: any) => item.label === 'electron.menuBar.troubleshooting'
						)
						.submenu.find(
							(item: any) =>
								item.label === 'electron.menuBar.disableHardwareAcceleration'
						);

					expect(item).not.toBeUndefined();
					expect(item.checked).toBe(true);
				});
			});
		});
	});

	describe.each([
		['Linux', 'linux'],
		['Windows', 'win32']
	])('on %s', (_, platformValue) => {
		let oldPlatform: NodeJS.Platform;

		beforeEach(() => {
			oldPlatform = process.platform;
			Object.defineProperty(process, 'platform', {value: platformValue});
			initMenuBar();
		});

		afterAll(() => {
			Object.defineProperty(process, 'platform', {value: oldPlatform});
		});

		it('creates an application menu with a quit menu item', () => {
			const menu1 = setApplicationMenuSpy.mock.calls[0][0][0];

			expect(menu1.label).toBe('mock-electron-app-name');
			expect(hasItemWithRole(menu1, 'quit')).toBe(true);
		});

		it('creates an Edit menu with standard menu items', () => {
			const menu2 = setApplicationMenuSpy.mock.calls[0][0][1];

			expect(menu2.label).toBe('electron.menuBar.edit');
			expect(hasItemWithRole(menu2, 'undo')).toBe(true);
			expect(hasItemWithRole(menu2, 'redo')).toBe(true);
			expect(hasItemWithRole(menu2, 'cut')).toBe(true);
			expect(hasItemWithRole(menu2, 'copy')).toBe(true);
			expect(hasItemWithRole(menu2, 'paste')).toBe(true);
			expect(hasItemWithRole(menu2, 'delete')).toBe(true);
			expect(hasItemWithRole(menu2, 'selectAll')).toBe(true);
		});

		it('creates a View menu with standard menu items', () => {
			const menu3 = setApplicationMenuSpy.mock.calls[0][0][2];

			expect(menu3.label).toBe('electron.menuBar.view');
			expect(hasItemWithRole(menu3, 'resetZoom')).toBe(true);
			expect(hasItemWithRole(menu3, 'zoomIn')).toBe(true);
			expect(hasItemWithRole(menu3, 'zoomOut')).toBe(true);
			expect(hasItemWithRole(menu3, 'togglefullscreen')).toBe(true);
		});

		it('adds a Set Story Library Folder menu item to the application menu', () => {
			const item = setApplicationMenuSpy.mock.calls[0][0][0].submenu.find(
				(item: any) => item.label === 'electron.menuBar.setStoryLibraryFolder'
			);

			expect(item).not.toBeUndefined();
			item.click();
			expect(chooseStoryDirectoryPathMock).toBeCalledTimes(1);
		});

		it('adds a Show Story Library menu item to the View menu', () => {
			const item = setApplicationMenuSpy.mock.calls[0][0][2].submenu.find(
				(item: any) => item.label === 'electron.menuBar.showStoryLibrary'
			);

			expect(item).not.toBeUndefined();
			item.click();
			expect(revealStoryDirectoryMock).toBeCalledTimes(1);
		});

		it('creates a Window menu with standard menu items', () => {
			const menu4 = setApplicationMenuSpy.mock.calls[0][0][3];

			expect(menu4.role).toBe('window');
			expect(hasItemWithRole(menu4, 'minimize')).toBe(true);
			expect(hasItemWithRole(menu4, 'close')).toBe(true);
		});

		describe('creates a Help menu', () => {
			it('has a Twine Help menu item', () => {
				const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];

				expect(menu5.role).toBe('help');

				const item = menu5.submenu.find(
					(item: any) => item.label === 'electron.menuBar.twineHelp'
				);

				expect(item).not.toBeUndefined();
				item.click();
				expect(openExternalMock.mock.calls).toEqual([
					['https://twinery.org/2guide']
				]);
			});

			it('has a Show Debug Console menu item', () => {
				const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
				const item = menu5.submenu
					.find(
						(item: any) => item.label === 'electron.menuBar.troubleshooting'
					)
					.submenu.find(
						(item: any) => item.label === 'electron.menuBar.showDevTools'
					);

				expect(item).not.toBeUndefined();
				item.click();
				expect(openDevToolsMock).toBeCalled();
			});

			describe('its Disable Hardware Acceleration menu item', () => {
				it('calls toggleHardwareAcceleration when clicked', () => {
					const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
					const item = menu5.submenu
						.find(
							(item: any) => item.label === 'electron.menuBar.troubleshooting'
						)
						.submenu.find(
							(item: any) =>
								item.label === 'electron.menuBar.disableHardwareAcceleration'
						);

					expect(item).not.toBeUndefined();
					item.click();
					expect(toggleHardwareAccelerationMock).toBeCalledTimes(1);
				});

				it('is unchecked if the pref is falsy', () => {
					const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
					const item = menu5.submenu
						.find(
							(item: any) => item.label === 'electron.menuBar.troubleshooting'
						)
						.submenu.find(
							(item: any) =>
								item.label === 'electron.menuBar.disableHardwareAcceleration'
						);

					expect(item).not.toBeUndefined();
					expect(item.checked).toBe(false);
				});

				it('is checked if the pref is truthy', () => {
					getAppPrefMock.mockImplementation((name: string) => {
						if (name === 'disableHardwareAcceleration') {
							return 'true';
						}

						throw new Error(`Asked for a unmocked app pref: ${name}`);
					});
					setApplicationMenuSpy.mockClear();
					initMenuBar();

					const menu5 = setApplicationMenuSpy.mock.calls[0][0][4];
					const item = menu5.submenu
						.find(
							(item: any) => item.label === 'electron.menuBar.troubleshooting'
						)
						.submenu.find(
							(item: any) =>
								item.label === 'electron.menuBar.disableHardwareAcceleration'
						);

					expect(item).not.toBeUndefined();
					expect(item.checked).toBe(true);
				});
			});
		});
	});
});
