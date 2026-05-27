import { supabase } from './supabase';

const STORAGE_KEY = "workout_logger_data";

export const defaultData = {
    templates: [
        {
            id: "t1",
            name: "Push Day",
            exercises: [
                {
                    id: "e1",
                    name: "Bench Press",
                    sets: [
                        { reps: 8, weight: 135, notes: "" },
                        { reps: 8, weight: 135, notes: "" },
                        { reps: 6, weight: 145, notes: "" },
                    ],
                },
                {
                    id: "e2",
                    name: "Overhead Press",
                    sets: [
                        { reps: 10, weight: 75, notes: "" },
                        { reps: 10, weight: 75, notes: "" },
                    ],
                },
                {
                    id: "e3",
                    name: "Tricep Dips",
                    sets: [
                        { reps: 12, weight: 0, notes: "" },
                        { reps: 12, weight: 0, notes: "" },
                    ],
                },
            ],
        },
    ],
    history: [],
};

export async function fetchAllData() {
    console.warn("DEBUG: Starting fetchAllData...");
    
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) {
        console.warn("DEBUG: User not authenticated. Returning empty data.");
        return { templates: [], history: [] };
    }

    const { data: templates, error: tError } = await supabase
        .from('templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order('created_at', { ascending: true });

    if (tError) {
        console.warn("DEBUG: Error fetching templates:", tError.message, tError.details);
    }

    const { data: history, error: hError } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (hError) {
        console.warn("DEBUG: Error fetching history:", hError.message, hError.details);
    }

    if (tError || hError) {
        console.warn('DEBUG: Falling back to local data due to fetch error.');
        // Fallback to localStorage if Supabase fails or isn't configured yet
        return loadLocalData();
    }
    console.warn("DEBUG: fetchAllData successful.");

    // Combine into the expected format
    return {
        templates: templates || [],
        history: history || [],
    };
}

export async function upsertTemplate(template) {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) throw new Error("Must be logged in to save template");

    const { error } = await supabase
        .from('templates')
        .upsert({
            id: template.id,
            name: template.name,
            exercises: template.exercises,
            user_id: user.id,
            is_system: false
        });
    
    if (error) throw error;
}

export async function deleteTemplate(id) {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) throw new Error("Must be logged in to delete template");

    const { error } = await supabase
        .from('templates')
        .delete()
        .match({ id, user_id: user.id });
    
    if (error) throw error;
}

export async function saveHistory(log) {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) throw new Error("Must be logged in to save history");

    const { error } = await supabase
        .from('history')
        .insert({
            id: log.id || genId(),
            template_name: log.template_name || log.templateName,
            date: log.date,
            duration: log.duration,
            exercises: log.exercises,
            user_id: user.id
        });
    
    if (error) throw error;
}

export async function deleteHistoryItem(id) {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) throw new Error("Must be logged in to delete history");

    const { error } = await supabase
        .from('history')
        .delete()
        .match({ id, user_id: user.id });
    
    if (error) throw error;
}

export async function clearAllHistory() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) throw new Error("Must be logged in to clear history");

    const { error } = await supabase
        .from('history')
        .delete()
        .eq('user_id', user.id);
    
    if (error) throw error;
}

export async function searchExercises(query) {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error searching exercises:', error);
        return [];
    }
    return data;
}

// Legacy/Migration helpers
export function loadLocalData() {
    try {
        const r = localStorage.getItem(STORAGE_KEY);
        if (r) return JSON.parse(r);
    } catch { }
    return defaultData;
}

export function clearLocalData() {
    localStorage.removeItem(STORAGE_KEY);
}

export function genId() {
    return Math.random().toString(36).slice(2, 9);
}
