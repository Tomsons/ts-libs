import { QueueManager } from '@tomsons/react-queue-manager';
import { FileForm } from './file-form';
import { TaskHistory } from './task-history';

export function App() {
	return (
		<QueueManager concurrency={4} maxRetries={4}>
			<div className="min-h-screen bg-gray-50 text-gray-800">
				<div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
					<h1 className="text-3xl font-bold text-center mb-8">Queue Manager Example</h1>
					<div className="space-y-8">
						<FileForm />
						<TaskHistory />
					</div>
				</div>
			</div>
		</QueueManager>
	);
}

export default App;
