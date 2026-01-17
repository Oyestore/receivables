import React, { useState } from 'react';

// Types would be imported from shared types
interface TableConfig { name: string; alias: string; }
interface FieldConfig { table: string; name: string; alias: string; aggregation?: string; }

export const QueryBuilderUI: React.FC = () => {
    const [tables, setTables] = useState<TableConfig[]>([]);
    const [fields, setFields] = useState<FieldConfig[]>([]);

    // Mock schema
    const availableTables = ['invoices', 'payments', 'customers', 'products'];
    const availableFields: Record<string, string[]> = {
        invoices: ['id', 'amount', 'status', 'created_at', 'customer_id'],
        payments: ['id', 'invoice_id', 'amount', 'method', 'date'],
        customers: ['id', 'name', 'email', 'region'],
        products: ['id', 'name', 'price', 'category']
    };

    const addTable = (tableName: string) => {
        setTables([...tables, { name: tableName, alias: `${tableName.charAt(0)}${tables.length + 1}` }]);
    };

    const addField = (tableAlias: string, fieldName: string) => {
        setFields([...fields, { table: tableAlias, name: fieldName, alias: fieldName }]);
    };

    return (
        <div className="query-builder flex h-full bg-gray-50">
            {/* Sidebar - Tables */}
            <div className="w-64 bg-white border-r border-gray-200 p-4">
                <h3 className="font-bold mb-4">Tables</h3>
                <div className="space-y-2">
                    {availableTables.map(table => (
                        <button
                            key={table}
                            onClick={() => addTable(table)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 text-sm"
                        >
                            + {table}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Area - Canvas */}
            <div className="flex-1 p-6 overflow-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4">Query Configuration</h2>

                    {/* Selected Tables */}
                    <div className="flex gap-4 mb-6">
                        {tables.map((table, idx) => (
                            <div key={idx} className="bg-white p-4 rounded shadow border border-gray-200 w-48">
                                <div className="font-bold border-b pb-2 mb-2 flex justify-between">
                                    <span>{table.name}</span>
                                    <span className="text-gray-400 text-xs">{table.alias}</span>
                                </div>
                                <div className="space-y-1">
                                    {availableFields[table.name]?.map(field => (
                                        <div
                                            key={field}
                                            className="text-sm cursor-pointer hover:text-blue-600 flex items-center"
                                            onClick={() => addField(table.alias, field)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={fields.some(f => f.table === table.alias && f.name === field)}
                                                readOnly
                                                className="mr-2"
                                            />
                                            {field}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {tables.length === 0 && (
                            <div className="text-gray-400 italic">Select tables from the sidebar to begin</div>
                        )}
                    </div>

                    {/* Selected Fields */}
                    {fields.length > 0 && (
                        <div className="bg-white p-4 rounded shadow border border-gray-200">
                            <h3 className="font-bold mb-2">Selected Fields</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500">
                                        <th className="pb-2">Table</th>
                                        <th className="pb-2">Field</th>
                                        <th className="pb-2">Alias</th>
                                        <th className="pb-2">Aggregation</th>
                                        <th className="pb-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map((field, idx) => (
                                        <tr key={idx} className="border-t border-gray-100">
                                            <td className="py-2">{field.table}</td>
                                            <td className="py-2">{field.name}</td>
                                            <td className="py-2">
                                                <input
                                                    type="text"
                                                    value={field.alias}
                                                    className="border rounded px-2 py-1 w-32"
                                                    onChange={(e) => {
                                                        const newFields = [...fields];
                                                        newFields[idx].alias = e.target.value;
                                                        setFields(newFields);
                                                    }}
                                                />
                                            </td>
                                            <td className="py-2">
                                                <select
                                                    className="border rounded px-2 py-1"
                                                    value={field.aggregation || ''}
                                                    onChange={(e) => {
                                                        const newFields = [...fields];
                                                        newFields[idx].aggregation = e.target.value;
                                                        setFields(newFields);
                                                    }}
                                                >
                                                    <option value="">None</option>
                                                    <option value="COUNT">Count</option>
                                                    <option value="SUM">Sum</option>
                                                    <option value="AVG">Avg</option>
                                                    <option value="MIN">Min</option>
                                                    <option value="MAX">Max</option>
                                                </select>
                                            </td>
                                            <td className="py-2">
                                                <button
                                                    onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer - Actions */}
            <div className="h-16 bg-white border-t border-gray-200 px-6 flex items-center justify-between fixed bottom-0 left-64 right-0">
                <div className="text-sm text-gray-500">
                    {tables.length} tables, {fields.length} fields selected
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                        Preview SQL
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Run Query
                    </button>
                </div>
            </div>
        </div>
    );
};
