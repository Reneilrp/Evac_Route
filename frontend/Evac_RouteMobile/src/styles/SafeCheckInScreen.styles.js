import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#16a34a',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#dcfce7',
        marginBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 20,
        marginBottom: 20,
    },
    iconCircle: {
        backgroundColor: '#dcfce7',
        padding: 12,
        borderRadius: 30,
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
    },
    cardSubtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748b',
    },
    list: {
        marginBottom: 24,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    itemLabel: {
        fontSize: 18,
        color: '#475569',
        fontWeight: 'bold',
    },
    itemValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
    },
    instructionBox: {
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
    },
    instructionText: {
        color: '#16a34a',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
    },
    backBtn: {
        marginTop: 40,
    },
    backBtnText: {
        color: '#dcfce7',
        fontSize: 16,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});

export default styles;
