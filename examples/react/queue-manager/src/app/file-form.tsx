import { FileUploadTask } from '@tomsons/concrete-tasks';
import { useQueueManager } from '@tomsons/react-queue-manager';
import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from 'react';

export const FileForm = () => {
	const queueManager = useQueueManager();
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFiles = useCallback(
		(files: FileList | null) => {
			if (!files) return;

			for (const file of Array.from(files)) {
				const task = new FileUploadTask({
					id: `${file.name}-${Date.now()}`,
					file,
					timeout: 500,
					streamConsumer: async ({ stream, abortController }) => {
						// In a real app, you'd upload to your server.
						// We'll simulate an upload that takes 2 seconds.
						await new Promise((resolve, reject) => {
							const timeout = setTimeout(() => {
								resolve({ url: `https://example.com/uploads/${file.name}` });
							}, 2000);
							abortController.signal.addEventListener('abort', () => {
								clearTimeout(timeout);
								reject(new Error('Upload aborted'));
							});
						});
					},
				});
				queueManager.enqueue(task);
				inputRef.current!.value = '';
			}
		},
		[queueManager],
	);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		handleFiles(event.target.files);
	};

	const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		handleFiles(event.dataTransfer.files);
	};

	const openFileDialog = () => {
		inputRef.current?.click();
	};

	const dropzoneClasses = `border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-200 ease-in-out ${
		isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
	}`;

	return (
		<div className="bg-gray-100 p-6 rounded-lg shadow-md">
			<h2 className="text-2xl font-semibold mb-4 text-center">Upload Files</h2>
			{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
			{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
			<div
				className={dropzoneClasses}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={openFileDialog}
			>
				<input ref={inputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
				<p className="text-gray-500">Drag & drop files here, or click to select files</p>
			</div>
		</div>
	);
};
