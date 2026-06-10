import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#0f172a', // gray-900
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        textAlign: 'center',
        color: '#ffffff',
        letterSpacing: 2,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        color: '#94a3b8',
        marginBottom: 48,
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    devLink: {
        marginTop: 32,
        alignItems: 'center',
    },
    devText: {
        color: '#64748b',
        textDecorationLine: 'underline',
    },
});

export default styles;
