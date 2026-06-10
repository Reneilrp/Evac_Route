import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    statusBanner: {
        flexDirection: 'row',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        paddingTop: 50,
    },
    bannerDanger: {
        backgroundColor: '#dc2626',
    },
    bannerSafe: {
        backgroundColor: '#16a34a',
    },
    bannerText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    actionArea: {
        padding: 20,
        alignItems: 'center',
    },
    evacuateBtn: {
        backgroundColor: '#dc2626',
        width: '100%',
        paddingVertical: 40,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 2,
        borderColor: '#f87171',
    },
    evacuateText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2,
    },
    safeBtn: {
        backgroundColor: '#16a34a',
        width: '100%',
        paddingVertical: 30,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    safeText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1,
    },
    card: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        alignItems: 'center',
        marginTop: 10,
    },
    cardTitle: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 20,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
    },
    hashText: {
        marginTop: 16,
        color: '#64748b',
        fontFamily: 'monospace',
        fontSize: 12,
    },
    infoBox: {
        alignItems: 'center',
        marginTop: 20,
    },
    infoText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    headcountBadge: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
    },
    headcountText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
    },
    instruction: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: 14,
        lineHeight: 22,
        marginTop: 30,
    },
});

export default styles;
