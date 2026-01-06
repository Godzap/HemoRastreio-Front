import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sampleApi } from '../../lib/api';
import {
    TestTube,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { SampleForm } from './SampleForm';
import './Samples.css';

interface Sample {
    id: string;
    barcode: string;
    patientCode: string;
    requestCode?: string;
    sampleType: { id: string; name: string; code: string };
    volumeMl?: number;
    collectionDatetime: string;
    status: string;
    expirationDate?: string;
    notes?: string;
    currentPosition?: {
        id: string;
        positionLabel: string;
        box: {
            name: string;
            shelf: {
                name: string;
                freezer: {
                    name: string;
                    storageRoom: { name: string };
                };
            };
        };
    };
}

const statusLabels: Record<string, string> = {
    COLLECTED: 'Coletada',
    STORED: 'Armazenada',
    IN_TRANSFER: 'Em Transferência',
    UNDER_ANALYSIS: 'Em Análise',
    ARCHIVED: 'Arquivada',
    DISCARDED: 'Descartada',
};

const statusColors: Record<string, string> = {
    COLLECTED: '#1976D2',
    STORED: '#388E3C',
    IN_TRANSFER: '#FFA000',
    UNDER_ANALYSIS: '#7B1FA2',
    ARCHIVED: '#616161',
    DISCARDED: '#D32F2F',
};

export const SamplesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSample, setEditingSample] = useState<Sample | null>(null);
    const pageSize = 10;

    const { data, isLoading, error } = useQuery({
        queryKey: ['samples', page, searchTerm, statusFilter],
        queryFn: async () => {
            const params: Record<string, unknown> = {
                page,
                limit: pageSize,
            };
            if (searchTerm) params.search = searchTerm;
            if (statusFilter) params.status = statusFilter;
            const response = await sampleApi.getAll(params);
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => sampleApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['samples'] });
        },
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const handleDelete = async (sample: Sample) => {
        if (window.confirm(`Deseja realmente excluir a amostra ${sample.barcode}?`)) {
            deleteMutation.mutate(sample.id);
        }
    };

    const handleEdit = (sample: Sample) => {
        setEditingSample(sample);
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingSample(null);
    };

    const handleFormSuccess = () => {
        handleFormClose();
        queryClient.invalidateQueries({ queryKey: ['samples'] });
    };

    const getLocationString = (sample: Sample): string => {
        if (!sample.currentPosition) return '-';
        const pos = sample.currentPosition;
        return `${pos.box.shelf.freezer.storageRoom.name} > ${pos.box.shelf.freezer.name} > ${pos.box.name} [${pos.positionLabel}]`;
    };

    const samples: Sample[] = data?.data || data || [];
    const totalPages = data?.meta?.totalPages || Math.ceil((data?.meta?.total || samples.length) / pageSize) || 1;

    return (
        <div className="samples-page">
            <div className="samples-header">
                <div className="header-title">
                    <TestTube size={28} />
                    <div>
                        <h1>Amostras</h1>
                        <p>Gerenciamento do estoque de amostras</p>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                    <Plus size={20} />
                    Cadastrar Nova Amostra
                </button>
            </div>

            {/* Filters */}
            <div className="samples-filters">
                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por código de barras ou paciente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn-secondary">
                        Buscar
                    </button>
                </form>

                <div className="filter-group">
                    <Filter size={20} />
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Todos os Status</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="samples-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <Loader2 size={48} className="spinner" />
                        <p>Carregando amostras...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <AlertCircle size={48} />
                        <p>Erro ao carregar amostras. Tente novamente.</p>
                    </div>
                ) : samples.length === 0 ? (
                    <div className="empty-state">
                        <TestTube size={48} />
                        <p>Nenhuma amostra encontrada</p>
                        <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                            Cadastrar Primeira Amostra
                        </button>
                    </div>
                ) : (
                    <table className="samples-table">
                        <thead>
                            <tr>
                                <th>Código de Barras</th>
                                <th>Paciente</th>
                                <th>Tipo</th>
                                <th>Data da Coleta</th>
                                <th>Status</th>
                                <th>Localização</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {samples.map((sample) => (
                                <tr key={sample.id}>
                                    <td className="barcode">{sample.barcode}</td>
                                    <td>{sample.patientCode}</td>
                                    <td>{sample.sampleType?.name || '-'}</td>
                                    <td>
                                        {new Date(sample.collectionDatetime).toLocaleString('pt-BR', {
                                            dateStyle: 'short',
                                            timeStyle: 'short',
                                        })}
                                    </td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={{ backgroundColor: statusColors[sample.status] }}
                                        >
                                            {statusLabels[sample.status] || sample.status}
                                        </span>
                                    </td>
                                    <td className="location">{getLocationString(sample)}</td>
                                    <td>
                                        <div className="actions">
                                            <button
                                                className="action-btn"
                                                title="Ver detalhes"
                                                onClick={() => handleEdit(sample)}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="action-btn"
                                                title="Editar"
                                                onClick={() => handleEdit(sample)}
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                title="Excluir"
                                                onClick={() => handleDelete(sample)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {samples.length > 0 && (
                    <div className="pagination">
                        <button
                            className="pagination-btn"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft size={20} />
                            Anterior
                        </button>
                        <span className="pagination-info">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            className="pagination-btn"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            Próximo
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <SampleForm
                    sample={editingSample}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                />
            )}
        </div>
    );
};
