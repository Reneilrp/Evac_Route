import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1e293b',
        borderWidth: 2,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: '#fff',
    },
    counterBox: {
        backgroundColor: '#1e293b',
        padding: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#334155',
        marginBottom: 32,
        alignItems: 'center',
    },
    counterLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#cbd5e1',
        marginBottom: 20,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
    },
    circleBtn: {
        backgroundColor: '#334155',
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterNumber: {
        fontSize: 48,
        fontWeight: '900',
        color: '#fff',
    },
    helperText: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 24,
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#1d4ed8',
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default styles;
