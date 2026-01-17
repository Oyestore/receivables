import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Dashboard from '../pages/Dashboard';
import DisputeList from '../pages/disputes/DisputeList';
import DisputeDetail from '../pages/disputes/DisputeDetail';
import CreateDispute from '../pages/disputes/CreateDispute';
import ApprovalQueue from '../pages/disputes/ApprovalQueue';
import CollectionList from '../pages/collections/CollectionList';
import CollectionDetail from '../pages/collections/CollectionDetail';
import LawyerDirectory from '../pages/legal/LawyerDirectory';

function App() {
    return (
        <Routes>
            <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Dispute Routes */}
                <Route path="disputes">
                    <Route index element={<DisputeList />} />
                    <Route path="create" element={<CreateDispute />} />
                    <Route path=":id" element={<DisputeDetail />} />
                </Route>

                {/* Approval Routes */}
                <Route path="approvals" element={<ApprovalQueue />} />

                {/* Collection Routes */}
                <Route path="collections">
                    <Route index element={<CollectionList />} />
                    <Route path=":id" element={<CollectionDetail />} />
                </Route>

                {/* Legal Routes */}
                <Route path="legal">
                    <Route path="directory" element={<LawyerDirectory />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;
