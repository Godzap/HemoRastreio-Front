import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sampleApi, api } from '../../lib/api';
import { X, Loader2, Save, AlertCircle } from 'lucide-react';

interface SampleType {
    id: string;
    code: string;
    name: string;
}

interface Sample {
    id: string;
    barcode: string;
    patientCode: string;
    requestCode?: string;
    sampleTypeId?: string;
    sampleType?: { id: string; name: string };
    volumeMl?: number;
    collectionDatetime: string;
    expirationDate?: string;
    notes?: string;
}

interface SampleFormProps {
    sample?: Sample | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const SampleForm: React.FC<SampleFormProps> = ({ sample, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        barcode: '',
        patientCode: '',
        requestCode: '',
        sampleTypeId: '',
        volumeMl: '',
        collectionDatetime: '',
        expirationDate: '',
        notes: '',
    });
    const [error, setError] = useState<string | null>(null);

    const { data: sampleTypes } = useQuery({
        queryKey: ['sample-types'],
        queryFn: async () => {
            const response = await api.get('/sample-types');
            return response.data as SampleType[];
        },
    });

    useEffect(() => {
        if (sample) {
            setFormData({
                barcode: sample.barcode || '',
                patientCode: sample.patientCode || '',
                requestCode: sample.requestCode || '',
                sampleTypeId: sample.sampleTypeId || sample.sampleType?.id || '',
                volumeMl: sample.volumeMl?.toString() || '',
                collectionDatetime: sample.collectionDatetime
                    ? new Date(sample.collectionDatetime).toISOString().slice(0, 16)
                    : '',
                expirationDate: sample.expirationDate
                    ? new Date(sample.expirationDate).toISOString().slice(0, 10)
                    : '',
                notes: sample.notes || '',
            });
        } else {
            // Set default collection datetime to now
            setFormData((prev) => ({
                ...prev,
                collectionDatetime: new Date().toISOString().slice(0, 16),
            }));
        }
    }, [sample]);

    const createMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => sampleApi.create(data),
        onSuccess: () => {
            onSuccess();
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            setError(err.response?.data?.message || 'Erro ao cadastrar amostra');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
            sampleApi.update(id, data),
        onSuccess: () => {
            onSuccess();
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            setError(err.response?.data?.message || 'Erro ao atualizar amostra');
        },
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.barcode.trim()) {
            setError('Código de barras é obrigatório');
            return;
        }
        if (!formData.patientCode.trim()) {
            setError('Código do paciente é obrigatório');
            return;
        }
        if (!formData.sampleTypeId) {
            setError('Tipo de amostra é obrigatório');
            return;
        }
        if (!formData.collectionDatetime) {
            setError('Data/hora da coleta é obrigatória');
            return;
        }

        const payload: Record<string, unknown> = {
            barcode: formData.barcode.trim(),
            patientCode: formData.patientCode.trim(),
            sampleTypeId: formData.sampleTypeId,
            collectionDatetime: new Date(formData.collectionDatetime).toISOString(),
        };

        if (formData.requestCode.trim()) {
            payload.requestCode = formData.requestCode.trim();
        }
        if (formData.volumeMl) {
            payload.volumeMl = parseFloat(formData.volumeMl);
        }
        if (formData.expirationDate) {
            payload.expirationDate = new Date(formData.expirationDate).toISOString();
        }
        if (formData.notes.trim()) {
            payload.notes = formData.notes.trim();
        }

        if (sample?.id) {
            updateMutation.mutate({ id: sample.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{sample ? 'Editar Amostra' : 'Cadastrar Nova Amostra'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="sample-form">
                    {error && (
                        <div className="form-error">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="barcode">Código de Barras *</label>
                            <input
                                type="text"
                                id="barcode"
                                name="barcode"
                                value={formData.barcode}
                                onChange={handleChange}
                                placeholder="Ex: SAMP-2026-001234"
                                disabled={!!sample}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="patientCode">Código do Paciente *</label>
                            <input
                                type="text"
                                id="patientCode"
                                name="patientCode"
                                value={formData.patientCode}
                                onChange={handleChange}
                                placeholder="Ex: PAC-001234"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="sampleTypeId">Tipo de Amostra *</label>
                            <select
                                id="sampleTypeId"
                                name="sampleTypeId"
                                value={formData.sampleTypeId}
                                onChange={handleChange}
                            >
                                <option value="">Selecione...</option>
                                {sampleTypes?.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} ({type.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="requestCode">Código da Requisição</label>
                            <input
                                type="text"
                                id="requestCode"
                                name="requestCode"
                                value={formData.requestCode}
                                onChange={handleChange}
                                placeholder="Ex: REQ-001234"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="collectionDatetime">Data/Hora da Coleta *</label>
                            <input
                                type="datetime-local"
                                id="collectionDatetime"
                                name="collectionDatetime"
                                value={formData.collectionDatetime}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="volumeMl">Volume (mL)</label>
                            <input
                                type="number"
                                id="volumeMl"
                                name="volumeMl"
                                value={formData.volumeMl}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                placeholder="Ex: 5.00"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="expirationDate">Data de Validade</label>
                            <input
                                type="date"
                                id="expirationDate"
                                name="expirationDate"
                                value={formData.expirationDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group" />
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="notes">Observações</label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Observações adicionais sobre a amostra..."
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {sample ? 'Salvar Alterações' : 'Cadastrar Amostra'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
