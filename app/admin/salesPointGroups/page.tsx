"use client";

import React, { useEffect, useState } from "react";

export default function AdminSalesPointGroupsPage() {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    const fetchGroups = async () => {
        try {
            const res = await fetch("/api/salesPointGroups");
            const data = await res.json();
            setGroups(data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleAdd = async () => {
        if (!newGroupName.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/salesPointGroups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newGroupName.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setNewGroupName("");
                fetchGroups();
            } else {
                alert("Hata: " + data.error);
            }
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`'${name}' grubunu silmek istediğinize emin misiniz?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/salesPointGroups/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                fetchGroups();
            } else {
                alert("Hata: " + data.error);
            }
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    }

    return (
        <div className="page-container">
            <h1 className="title-lg outfit mb-4">🏷️ Satış Noktası Grupları</h1>

            <div className="premium-card" style={{ marginBottom: "2rem" }}>
                <h3 className="mb-3">Yeni Grup Ekle</h3>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                        type="text"
                        className="premium-input"
                        placeholder="Satış Noktası Grubu (Örn: 1.GRUP-BAYİ)"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #ddd" }}
                    />
                    <button onClick={handleAdd} disabled={loading || !newGroupName} className="tibcon-btn tibcon-btn-primary">
                        {loading ? "Ekleniyor..." : "Ekle"}
                    </button>
                </div>
            </div>

            <table className="premium-table">
                <thead>
                    <tr>
                        <th>Grup Adı</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map(g => (
                        <tr key={g.id}>
                            <td><strong>{g.name}</strong></td>
                            <td>
                                <button onClick={() => handleDelete(g.id, g.name)} className="tibcon-btn tibcon-btn-outline" style={{ color: "var(--tibcon-red)", borderColor: "var(--tibcon-red)", padding: "0.5rem 1rem" }}>
                                    Sil
                                </button>
                            </td>
                        </tr>
                    ))}
                    {groups.length === 0 && <tr><td colSpan={2} style={{ textAlign: "center" }}>Kayıtlı grup bulunmuyor.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
