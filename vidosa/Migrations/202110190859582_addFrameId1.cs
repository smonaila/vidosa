namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addFrameId1 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.ConnectionIds", "IsConnected", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.ConnectionIds", "IsConnected");
        }
    }
}
