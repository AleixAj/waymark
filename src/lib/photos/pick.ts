/** Opens the system file picker. With `folder` the user picks a whole folder. */
export function pickFiles(folder = false): Promise<File[]> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.multiple = true;
		if (folder) input.webkitdirectory = true;
		else input.accept = 'image/*,.heic,.heif';
		input.onchange = () => resolve(Array.from(input.files ?? []));
		input.click();
	});
}
