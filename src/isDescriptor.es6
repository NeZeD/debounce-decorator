export default function isDescriptor( desc ) {
    if( !desc || !desc.hasOwnProperty ) {
        return false;
    }

    return desc.hasOwnProperty( 'value' ) ||
        desc.hasOwnProperty( 'get' ) ||
        desc.hasOwnProperty( 'set' );
}
